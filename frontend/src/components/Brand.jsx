import { Link } from 'react-router-dom';
import { brand } from '../config.js';

export default function Brand() {
  return (
    <Link to="/" className="brand">
      <span className="brand-logo" aria-hidden="true"><brand.Icon size={22} /></span>
      <span>
        <span className="brand-name">{brand.name}</span>
        <span className="brand-tagline">{brand.tagline}</span>
      </span>
    </Link>
  );
}
