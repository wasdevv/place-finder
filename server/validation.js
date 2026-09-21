export class ValidationError extends Error {
  status = 400;
}

const fail = (message) => {
  throw new ValidationError(message);
};

export function toNumber(value, name) {
  if (value === undefined || value === null || value === '') fail(`${name} is required`);
  const n = Number(value);
  if (!Number.isFinite(n)) fail(`${name} must be a number`);
  return n;
}

export function latitude(value) {
  const n = toNumber(value, 'lat');
  if (n < -90 || n > 90) fail('lat must be between -90 and 90');
  return n;
}

export function longitude(value) {
  const n = toNumber(value, 'lng');
  if (n < -180 || n > 180) fail('lng must be between -180 and 180');
  return n;
}

export const MAX_RADIUS_KM = 50;

export function radiusKm(value) {
  if (value === undefined || value === '') return 5;
  const n = toNumber(value, 'radiusKm');
  if (n <= 0 || n > MAX_RADIUS_KM) fail(`radiusKm must be greater than 0 and at most ${MAX_RADIUS_KM}`);
  return n;
}

export function positiveInt(value, name, fallback, max = Infinity) {
  if (value === undefined || value === '') return fallback;
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1) fail(`${name} must be a positive integer`);
  return Math.min(n, max);
}

export function searchTerm(value) {
  const q = typeof value === 'string' ? value.trim() : '';
  if (!q) fail('q is required');
  if (q.length > 100) fail('q must be at most 100 characters');
  return q;
}

export const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function text(value, name, max, required) {
  if (value === undefined || value === null || value === '') {
    if (required) fail(`${name} is required`);
    return undefined;
  }
  if (typeof value !== 'string') fail(`${name} must be a string`);
  const s = value.trim();
  if (required && !s) fail(`${name} is required`);
  if (s.length > max) fail(`${name} must be at most ${max} characters`);
  return s || undefined;
}

export function placeInput(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) fail('body must be a JSON object');

  const place = {
    name: text(body.name, 'name', 120, true),
    alternateName: text(body.alternateName, 'alternateName', 120),
    address: text(body.address, 'address', 200, true),
    neighborhood: text(body.neighborhood, 'neighborhood', 80, true),
    city: text(body.city, 'city', 80, true),
    phone: text(body.phone, 'phone', 40),
    website: text(body.website, 'website', 300),
    hours: text(body.hours, 'hours', 500),
    location: { type: 'Point', coordinates: [longitude(body.lng), latitude(body.lat)] },
  };

  if (place.website && !/^https?:\/\//i.test(place.website)) fail('website must start with http:// or https://');

  if (body.rating !== undefined && body.rating !== null) {
    if (typeof body.rating !== 'number' || !Number.isFinite(body.rating) || body.rating < 0 || body.rating > 5) {
      fail('rating must be a number between 0 and 5');
    }
    place.rating = body.rating;
  }

  if (body.tags !== undefined) {
    const { tags } = body;
    if (!Array.isArray(tags) || tags.length > 20 || tags.some((t) => typeof t !== 'string' || !t.trim() || t.length > 40)) {
      fail('tags must be an array of up to 20 non-empty strings of at most 40 characters');
    }
    place.tags = tags.map((t) => t.trim());
  }

  return Object.fromEntries(Object.entries(place).filter(([, v]) => v !== undefined));
}

export function distanceKm(lat1, lng1, lat2, lng2) {
  const rad = (d) => (d * Math.PI) / 180;
  const a =
    Math.sin(rad(lat2 - lat1) / 2) ** 2 +
    Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(rad(lng2 - lng1) / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
