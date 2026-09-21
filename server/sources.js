export const AREA = 'São José do Rio Preto';

export const SOURCES = [
  { category: 'pharmacy', key: 'amenity', value: 'pharmacy' },
  { category: 'mall', key: 'shop', value: 'mall' },
  { category: 'park', key: 'leisure', value: 'park', name: '^Parque' },
  { category: 'zoo', key: 'tourism', value: 'zoo' },
  { category: 'water', key: 'natural', value: 'water', name: '^(Lago|Represa)' },
  { category: 'water', key: 'waterway', value: 'river', geometry: true },
  { category: 'hospital', key: 'amenity', value: 'hospital' },
  { category: 'culture', key: 'amenity', value: 'theatre|cinema|library' },
  { category: 'culture', key: 'tourism', value: 'museum' },
  { category: 'sports', key: 'leisure', value: 'stadium' },
  { category: 'fuel', key: 'amenity', value: 'fuel' },
  { category: 'ice_cream', key: 'amenity', value: 'ice_cream' },
  { category: 'transit', key: 'amenity', value: 'bus_station' },
];

const statement = ({ key, value, name, geometry }) =>
  `${geometry ? 'way' : 'nwr'}["${key}"~"^(${value})$"]["name"${name ? `~"${name}"` : ''}](area.a);`;

export function overpassQuery(sources = SOURCES) {
  const points = sources.filter((s) => !s.geometry).map(statement).join('');
  const lines = sources.filter((s) => s.geometry).map(statement).join('');
  return `[out:json][timeout:90];area["name"="${AREA}"]["admin_level"="8"]->.a;(${points});out tags center;(${lines});out tags geom;`;
}

export function categoryFor(tags, sources = SOURCES) {
  return sources.find(
    ({ key, value, name }) =>
      new RegExp(`^(${value})$`).test(tags[key] ?? '') && tags.name && (!name || new RegExp(name).test(tags.name)),
  )?.category;
}

const firstPhone = (value) => value?.split(';')[0].trim().slice(0, 40) || undefined;

function pointOf(element) {
  if (element.geometry?.length) {
    const { lat, lon } = element.geometry[Math.floor(element.geometry.length / 2)];
    return [lat, lon];
  }
  const lat = element.lat ?? element.center?.lat;
  const lon = element.lon ?? element.center?.lon;
  return Number.isFinite(lat) && Number.isFinite(lon) ? [lat, lon] : null;
}

export function toPlace(element) {
  const tags = element.tags ?? {};
  const category = categoryFor(tags);
  const point = pointOf(element);
  if (!category || !point) return null;

  const website = tags.website ?? tags['contact:website'];
  const hours = tags.opening_hours === '24/7' ? 'Open 24 hours' : tags.opening_hours?.replace(/;\s*/g, '\n');

  return {
    osmId: `${element.type}/${element.id}`,
    category,
    name: tags.name.trim().slice(0, 120),
    street: [tags['addr:street'], tags['addr:housenumber']].filter(Boolean).join(', ') || undefined,
    neighborhood: tags['addr:suburb'],
    lat: +point[0].toFixed(6),
    lng: +point[1].toFixed(6),
    phone: firstPhone(tags.phone ?? tags['contact:phone']),
    website: /^https?:\/\//i.test(website ?? '') ? website : undefined,
    hours: hours?.slice(0, 500),
    tags: tags.opening_hours === '24/7' ? ['24h'] : [],
  };
}

export function placesFrom(elements) {
  const byId = new Map();
  const lines = new Map();
  for (const element of elements) {
    const place = toPlace(element);
    if (!place) continue;
    if (element.geometry) {
      const key = `${place.category}|${place.name}`;
      const size = element.geometry.length;
      const kept = lines.get(key);
      if (!kept || size > kept.size || (size === kept.size && element.id < kept.id)) {
        lines.set(key, { id: element.id, size, place });
      }
    } else {
      byId.set(place.osmId, place);
    }
  }
  for (const { place } of lines.values()) byId.set(place.osmId, place);
  return [...byId.values()];
}
