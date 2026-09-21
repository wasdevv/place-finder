import {
  Bus, Drama, Fuel, Hospital, IceCreamCone, MapPin, MapPinned, PawPrint, Pill, ShoppingBag, Trees, Trophy, Waves,
} from 'lucide-react';

export const brand = {
  name: 'Place Finder',
  tagline: 'Explore São José do Rio Preto',
  Icon: MapPinned,
  singular: 'place',
  plural: 'places',
  title: 'Nearby Places',
};

export const categories = {
  pharmacy: { label: 'Pharmacies', Icon: Pill, color: '#0f9d7a' },
  mall: { label: 'Malls', Icon: ShoppingBag, color: '#7c3aed' },
  park: { label: 'Parks', Icon: Trees, color: '#15803d' },
  zoo: { label: 'Zoo', Icon: PawPrint, color: '#c2410c' },
  water: { label: 'Rivers & lakes', Icon: Waves, color: '#0369a1' },
  hospital: { label: 'Hospitals', Icon: Hospital, color: '#dc2626' },
  culture: { label: 'Culture', Icon: Drama, color: '#be185d' },
  sports: { label: 'Stadiums', Icon: Trophy, color: '#a16207' },
  fuel: { label: 'Gas stations', Icon: Fuel, color: '#334155' },
  ice_cream: { label: 'Ice cream', Icon: IceCreamCone, color: '#db2777' },
  transit: { label: 'Bus stations', Icon: Bus, color: '#1d4ed8' },
};

export const categoryOf = (key) => categories[key] ?? { label: 'Place', Icon: MapPin, color: '#475569' };

export const demoLocation = { lat: -20.8165, lng: -49.3795, city: 'São José do Rio Preto' };

export const radiusOptions = [1, 2, 5, 10, 25, 50];
export const defaultRadius = 10;
