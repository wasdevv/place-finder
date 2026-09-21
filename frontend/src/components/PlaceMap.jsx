import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Circle, MapContainer, Marker, TileLayer, Tooltip, ZoomControl, useMap } from 'react-leaflet';
import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';
import L from 'leaflet';
import { brand } from '../config.js';
import { coordsOf } from '../format.js';

function iconMarkup() {
  const container = document.createElement('span');
  const root = createRoot(container);
  flushSync(() => root.render(<brand.Icon size={18} color="#fff" />));
  const markup = container.innerHTML;
  root.unmount();
  return markup;
}

export const placeIcon = L.divIcon({
  className: 'pin',
  html: `<span class="pin-head"><span>${iconMarkup()}</span></span>`,
  iconSize: [44, 54],
  iconAnchor: [22, 54],
  tooltipAnchor: [0, -50],
});

export const tiles = {
  url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  maxZoom: 19,
};

const userIcon = L.divIcon({ className: 'me', iconSize: [22, 22] });

function Viewport({ origin, radius, points, fitPoints, layoutKey }) {
  const map = useMap();

  useEffect(() => {
    map.invalidateSize();
  }, [map, layoutKey]);

  useEffect(() => {
    if (fitPoints && points.length > 0) {
      map.fitBounds(L.latLngBounds(points), { padding: [60, 60], maxZoom: 16 });
    } else {
      map.fitBounds(L.latLng(origin).toBounds(radius * 2000), { padding: [20, 20] });
    }
  }, [map, origin, radius, points, fitPoints]);

  return null;
}

export default function PlaceMap({ places, origin, radius, fitPlaces, layoutKey }) {
  const navigate = useNavigate();
  const markers = useMemo(
    () => places.map((place) => [place, coordsOf(place)]).filter(([, coords]) => coords),
    [places],
  );
  const points = useMemo(() => markers.map(([, coords]) => coords), [markers]);

  return (
    <MapContainer center={origin} zoom={14} className="map" zoomControl={false}>
      <ZoomControl position="bottomright" />
      <TileLayer {...tiles} />
      <Viewport
        origin={origin}
        radius={radius}
        points={points}
        fitPoints={fitPlaces}
        layoutKey={layoutKey}
      />
      {!fitPlaces && <Circle center={origin} radius={radius * 1000} pathOptions={{ color: '#0f9d7a', weight: 1, fillOpacity: 0.05 }} />}
      <Marker position={origin} icon={userIcon} keyboard={false}>
        <Tooltip>You are here</Tooltip>
      </Marker>
      {markers.map(([place, coords]) => (
        <Marker
          key={place._id}
          position={coords}
          icon={placeIcon}
          title={place.name}
          eventHandlers={{ click: () => navigate(`/place/${place._id}`) }}
        >
          <Tooltip>{place.name}</Tooltip>
        </Marker>
      ))}
    </MapContainer>
  );
}
