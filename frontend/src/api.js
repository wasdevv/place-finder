async function request(path, params, signal) {
  const query = params ? `?${new URLSearchParams(params)}` : '';
  const response = await fetch(`/api${path}${query}`, { signal });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(body.error || `Request failed (${response.status})`);
    error.status = response.status;
    throw error;
  }
  return body;
}

export const getNearby = (lat, lng, radiusKm, signal) => request('/places/nearby', { lat, lng, radiusKm }, signal);
export const searchPlaces = (q, lat, lng, signal) => request('/places/search', { q, lat, lng }, signal);
export const getPlace = (id, signal) => request(`/places/${encodeURIComponent(id)}`, null, signal);
