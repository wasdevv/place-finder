import { MapPin, MapPinned, PawPrint, Pill, ShoppingBag, Trees, Waves } from 'lucide-react';

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
};

export const categoryOf = (key) => categories[key] ?? { label: 'Place', Icon: MapPin, color: '#475569' };

export const demoLocation = { lat: -20.8165, lng: -49.3795, city: 'São José do Rio Preto' };

export const radiusOptions = [1, 2, 5, 10, 25, 50];
export const defaultRadius = 10;
