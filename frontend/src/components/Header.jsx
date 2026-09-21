import { useState } from 'react';
import { LocateFixed, Search } from 'lucide-react';
import Brand from './Brand.jsx';
import { brand, radiusOptions } from '../config.js';

export default function Header({ radius, onRadiusChange, onSearch, onLocate, locating }) {
  const [term, setTerm] = useState('');

  const submit = (event) => {
    event.preventDefault();
    onSearch(term.trim());
  };

  const change = (event) => {
    setTerm(event.target.value);
    if (!event.target.value) onSearch('');
  };

  return (
    <header className="topbar">
      <Brand />

      <form className="search" role="search" onSubmit={submit}>
        <label className="search-field">
          <span className="sr-only">Search {brand.plural}</span>
          <Search size={18} aria-hidden="true" />
          <input
            type="search"
            value={term}
            onChange={change}
            maxLength={100}
            placeholder={`Search ${brand.singular}, area or city…`}
          />
        </label>
        <button type="submit" className="btn btn-primary">Search</button>
      </form>

      <div className="actions">
        <label className="radius">
          <span className="sr-only">Search radius</span>
          <select value={radius} onChange={(event) => onRadiusChange(Number(event.target.value))}>
            {radiusOptions.map((km) => (
              <option key={km} value={km}>{km} km</option>
            ))}
          </select>
        </label>
        <button type="button" className="btn btn-dark" onClick={onLocate} disabled={locating}>
          <LocateFixed size={18} aria-hidden="true" />
          {locating ? 'Locating…' : 'My Location'}
        </button>
      </div>
    </header>
  );
}
