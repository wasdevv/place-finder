import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Clock, Globe, MapPin, Navigation, Phone, Star } from 'lucide-react';
import { MapContainer, Marker, TileLayer } from 'react-leaflet';
import Brand from '../components/Brand.jsx';
import { getPlace } from '../api.js';
import { brand } from '../config.js';
import { coordsOf, isNumber } from '../format.js';
import { placeIcon, tiles } from '../components/PlaceMap.jsx';

export default function PlaceDetail() {
  const { id } = useParams();
  const [state, setState] = useState({ loading: true });

  useEffect(() => {
    const controller = new AbortController();
    setState({ loading: true });
    getPlace(id, controller.signal)
      .then((body) => setState({ place: body.data }))
      .catch((error) => {
        if (error.name !== 'AbortError') {
          setState({ error: error.status === 404 || error.status === 400 ? `This ${brand.singular} does not exist.` : error.message });
        }
      });
    return () => controller.abort();
  }, [id]);

  const { place, loading, error } = state;
  const coords = coordsOf(place);

  return (
    <div className="detail-page">
      <header className="topbar topbar-simple">
        <Brand />
      </header>

      <main className="detail">
        <Link to="/" className="back">
          <ArrowLeft size={18} aria-hidden="true" />
          Back to map
        </Link>

        {loading && <p className="panel">Loading…</p>}
        {error && <p className="panel error" role="alert">{error}</p>}

        {place && (
          <article className="panel detail-card">
            <div className="detail-head">
              <span className="card-icon card-icon-lg" aria-hidden="true"><brand.Icon size={30} /></span>
              <div>
                <h1>{place.name}</h1>
                {place.alternateName && <p className="card-alt" dir="auto">{place.alternateName}</p>}
                {isNumber(place.rating) && (
                  <p className="rating">
                    <Star size={15} aria-hidden="true" />
                    {place.rating.toFixed(1)} / 5
                  </p>
                )}
              </div>
            </div>

            <ul className="facts">
              <li>
                <MapPin size={18} aria-hidden="true" />
                <span>
                  {place.address}
                  <span className="muted">{[place.neighborhood, place.city].filter(Boolean).join(', ')}</span>
                </span>
              </li>
              {place.phone && (
                <li>
                  <Phone size={18} aria-hidden="true" />
                  <a href={`tel:${place.phone.replace(/[^\d+]/g, '')}`}>{place.phone}</a>
                </li>
              )}
              {place.website && (
                <li>
                  <Globe size={18} aria-hidden="true" />
                  <a href={place.website} target="_blank" rel="noopener noreferrer">{place.website}</a>
                </li>
              )}
              {place.hours && (
                <li>
                  <Clock size={18} aria-hidden="true" />
                  <span className="hours">{place.hours}</span>
                </li>
              )}
            </ul>

            {place.tags?.length > 0 && (
              <div className="tags">
                {place.tags.map((tag, i) => (
                  <span key={tag} className={`tag tag-${i % 3}`}>{tag}</span>
                ))}
              </div>
            )}

            {coords && (
              <>
                <MapContainer center={coords} zoom={16} className="detail-map" scrollWheelZoom={false}>
                  <TileLayer {...tiles} />
                  <Marker position={coords} icon={placeIcon} />
                </MapContainer>
                <a
                  className="btn btn-primary btn-block"
                  href={`https://www.google.com/maps/dir/?api=1&destination=${coords.join(',')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Navigation size={18} aria-hidden="true" />
                  Get directions
                </a>
              </>
            )}
          </article>
        )}
      </main>
    </div>
  );
}
