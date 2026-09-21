import Place from './place.js';
import { AREA, overpassQuery, placesFrom } from './sources.js';
import { placeInput } from './validation.js';

const OVERPASS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
];
const USER_AGENT = 'place-finder (https://github.com/wasdevv/place-finder)';
const OPTIONAL = ['alternateName', 'phone', 'website', 'hours', 'rating'];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function fetchOsm() {
  const failures = [];
  for (const url of [...OVERPASS, OVERPASS[0]]) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        body: new URLSearchParams({ data: overpassQuery() }),
        headers: { 'User-Agent': USER_AGENT },
        signal: AbortSignal.timeout(100_000),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const body = await response.json();
      if (!Array.isArray(body?.elements)) throw new Error('no elements in response');
      if (body.remark) throw new Error(body.remark);
      return body.elements;
    } catch (error) {
      failures.push(`${new URL(url).host}: ${error.message}`);
    }
  }
  const error = new Error(`OpenStreetMap is unavailable (${failures.join('; ')})`);
  error.status = 502;
  throw error;
}

async function reverseGeocode(lat, lng) {
  const url = `https://nominatim.openstreetmap.org/reverse?format=json&zoom=18&lat=${lat}&lon=${lng}`;
  const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(10_000) });
  if (!response.ok) throw new Error(`Nominatim HTTP ${response.status}`);
  const body = await response.json();
  const address = body && typeof body === 'object' && body.address ? body.address : {};
  return {
    address: [address.road, address.house_number].filter(Boolean).join(', ') || undefined,
    neighborhood: address.suburb || address.neighbourhood || address.quarter || address.city_district,
  };
}

export async function sync({ lookupLimit = Infinity, replace = false } = {}) {
  const startedAt = new Date();
  const found = placesFrom(await fetchOsm());
  if (replace) await Place.deleteMany({});
  const previouslyActive = await Place.countDocuments({ source: 'osm', stale: { $ne: true } });
  const known = new Map(
    (await Place.find({ osmId: { $in: found.map((p) => p.osmId) } }, { osmId: 1, address: 1, neighborhood: 1 }).lean())
      .map((p) => [p.osmId, p]),
  );

  const stats = { found: found.length, inserted: 0, updated: 0, pending: 0, skipped: 0, stale: 0, staleCheck: 'done' };
  const operations = [];
  let lookups = 0;

  for (const place of found) {
    const current = known.get(place.osmId);
    let address = place.street ?? current?.address;
    let neighborhood = place.neighborhood ?? current?.neighborhood;

    if (!address || !neighborhood) {
      if (lookups >= lookupLimit) {
        stats.pending++;
        continue;
      }
      if (lookups > 0) await sleep(1100);
      lookups++;
      try {
        const geo = await reverseGeocode(place.lat, place.lng);
        address ??= geo.address;
        neighborhood ??= geo.neighborhood;
      } catch {
        stats.pending++;
        continue;
      }
    }

    let doc;
    try {
      doc = placeInput({ ...place, address, neighborhood, city: AREA });
    } catch {
      stats.skipped++;
      continue;
    }

    const unset = Object.fromEntries(OPTIONAL.filter((key) => !(key in doc)).map((key) => [key, '']));
    operations.push({
      updateOne: {
        filter: { osmId: place.osmId },
        update: {
          $set: { ...doc, osmId: place.osmId, source: 'osm', seenAt: startedAt, stale: false },
          ...(Object.keys(unset).length && { $unset: unset }),
        },
        upsert: true,
      },
    });
    stats[current ? 'updated' : 'inserted']++;
  }

  if (operations.length) await Place.bulkWrite(operations, { ordered: false });

  if (found.length >= previouslyActive * 0.5) {
    const result = await Place.updateMany(
      { source: 'osm', stale: { $ne: true }, seenAt: { $lt: startedAt } },
      { $set: { stale: true } },
    );
    stats.stale = result.modifiedCount;
  } else {
    stats.staleCheck = `skipped: OpenStreetMap returned ${found.length} places, fewer than half of the ${previouslyActive} on file`;
  }

  return stats;
}
