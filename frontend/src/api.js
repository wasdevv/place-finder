async function request(path, params, signal) {
  const defined = Object.entries(params ?? {}).filter(([, value]) => value !== undefined && value !== '');
  const query = defined.length ? `?${new URLSearchParams(defined)}` : '';
  const response = await fetch(`/api${path}${query}`, { signal });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(body.error || `Request failed (${response.status})`);
    error.status = response.status;
    throw error;
  }
  return body;
}

export const getNearby = (lat, lng, radiusKm, category, signal) =>
  request('/places/nearby', { lat, lng, radiusKm, category }, signal);
export const searchPlaces = (q, lat, lng, category, signal) =>
  request('/places/search', { q, lat, lng, category }, signal);
export const getPlace = (id, signal) => request(`/places/${encodeURIComponent(id)}`, null, signal);
