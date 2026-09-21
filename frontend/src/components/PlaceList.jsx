import { Link } from 'react-router-dom';
import { ChevronRight, MapPin, Navigation, Star } from 'lucide-react';
import { brand } from '../config.js';
import { formatKm, isNumber } from '../format.js';

export default function PlaceList({ places, subtitle, loading, error, query }) {
  return (
    <aside className="sidebar" aria-busy={loading}>
      <div className="sidebar-head">
        <h2>
          {query ? 'Search results' : brand.title}
          <span className="count">{places.length}</span>
        </h2>
        <p className="muted">
          <MapPin size={14} aria-hidden="true" />
          {subtitle}
        </p>
      </div>

      {error && <p className="sidebar-message error" role="alert">{error}</p>}
      {loading && <p className="sidebar-message">Loading…</p>}
      {!loading && !error && places.length === 0 && (
        <p className="sidebar-message">
          No {brand.plural} found. {query ? 'Try another search.' : 'Try a larger radius.'}
        </p>
      )}

      <ul className="cards">
        {places.map((place) => (
          <li key={place._id}>
            <Link to={`/place/${place._id}`} className="card">
              <span className="card-icon" aria-hidden="true"><brand.Icon size={20} /></span>
              <span className="card-body">
                <span className="card-title">{place.name}</span>
                {place.alternateName && <span className="card-alt" dir="auto">{place.alternateName}</span>}
                <span className="muted">{[place.neighborhood, place.city].filter(Boolean).join(', ')}</span>
                {(isNumber(place.distance) || isNumber(place.rating)) && (
                  <span className="card-meta">
                    {isNumber(place.distance) && (
                      <span className="distance">
                        <Navigation size={13} aria-hidden="true" />
                        {formatKm(place.distance)}
                      </span>
                    )}
                    {isNumber(place.rating) && (
                      <span className="rating">
                        <Star size={13} aria-hidden="true" />
                        {place.rating.toFixed(1)}
                      </span>
                    )}
                  </span>
                )}
                {place.tags?.length > 0 && (
                  <span className="tags">
                    {place.tags.slice(0, 3).map((tag, i) => (
                      <span key={tag} className={`tag tag-${i}`}>{tag}</span>
                    ))}
                  </span>
                )}
              </span>
              <ChevronRight size={18} className="card-chevron" aria-hidden="true" />
            </Link>
          </li>
        ))}
      </ul>
    </aside>
  );
}
