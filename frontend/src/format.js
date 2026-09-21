export const isNumber = (value) => typeof value === 'number' && Number.isFinite(value);

export function coordsOf(place) {
  const [lng, lat] = place?.location?.coordinates ?? [];
  return isNumber(lat) && isNumber(lng) ? [lat, lng] : null;
}

export const formatKm = (km) => (km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(2)} km`);
