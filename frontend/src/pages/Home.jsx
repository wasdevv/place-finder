import { useEffect, useState } from 'react';
import { MapPin, X } from 'lucide-react';
import Header from '../components/Header.jsx';
import PlaceList from '../components/PlaceList.jsx';
import PlaceMap from '../components/PlaceMap.jsx';
import { getNearby, searchPlaces } from '../api.js';
import { brand, defaultRadius, demoLocation } from '../config.js';

const demoOrigin = { coords: [demoLocation.lat, demoLocation.lng], demo: true };

export default function Home() {
  const [origin, setOrigin] = useState(demoOrigin);
  const [radius, setRadius] = useState(defaultRadius);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [places, setPlaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [locating, setLocating] = useState(false);

  const locate = () => {
    const fallback = (reason) => {
      setNotice(origin.demo ? `${reason} Showing ${demoLocation.city} as demo location.` : reason);
      setLocating(false);
    };

    if (!navigator.geolocation) return fallback('Your browser does not support location.');

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setOrigin({ coords: [coords.latitude, coords.longitude], demo: false });
        setNotice('');
        setLocating(false);
      },
      () => fallback('Could not get your location.'),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 },
    );
  };

  useEffect(() => {
    locate();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const [lat, lng] = origin.coords;
    setLoading(true);
    setError('');

    const request = query
      ? searchPlaces(query, lat, lng, category, controller.signal)
      : getNearby(lat, lng, radius, category, controller.signal);

    request
      .then((body) => setPlaces(body.data))
      .catch((err) => {
        if (err.name !== 'AbortError') setError(err.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [origin, radius, query, category]);

  const where = origin.demo ? `${demoLocation.city} (demo)` : 'your location';
  const subtitle = query ? `Matches for “${query}”` : `Within ${radius} km of ${where}`;

  return (
    <div className="app">
      <Header
        radius={radius}
        onRadiusChange={setRadius}
        onSearch={setQuery}
        onLocate={locate}
        locating={locating}
      />

      {notice && (
        <div className="notice" role="status">
          <span className="notice-dot" aria-hidden="true" />
          <span>{notice}</span>
          <button type="button" className="icon-btn" onClick={() => setNotice('')} aria-label="Dismiss">
            <X size={18} />
          </button>
        </div>
      )}

      <main className="layout">
        <PlaceList
          places={places}
          subtitle={subtitle}
          loading={loading}
          error={error}
          query={query}
          category={category}
          onCategoryChange={setCategory}
        />
        <section className="map-wrap" aria-label="Map">
          <PlaceMap
            places={places}
            origin={origin.coords}
            radius={radius}
            fitPlaces={Boolean(query)}
            layoutKey={notice}
          />
          <div className="map-card">
            <span className="map-card-icon" aria-hidden="true"><MapPin size={18} /></span>
            <span>
              <strong>{query ? 'Search results' : 'Explore nearby'}</strong>
              <span className="muted">
                {places.length} {places.length === 1 ? brand.singular : brand.plural}
                {query ? ' found' : ` within ${radius} km`}
              </span>
            </span>
          </div>
        </section>
      </main>
    </div>
  );
}
