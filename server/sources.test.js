import { test } from 'node:test';
import assert from 'node:assert/strict';
import { categoryFor, overpassQuery, placesFrom, toPlace } from './sources.js';

const pharmacy = {
  type: 'node', id: 3897495209, lat: -20.8208117, lon: -49.3655118,
  tags: {
    'addr:housenumber': '1155', 'addr:street': 'Avenida Murchid Homsi', amenity: 'pharmacy',
    name: 'Rio Pharma', opening_hours: '24/7', phone: '+55 17 3215 3030',
  },
};
const mall = {
  type: 'way', id: 227731153, center: { lat: -20.8351666, lon: -49.3985608 },
  tags: {
    'addr:housenumber': '6363', 'addr:street': 'Avenida Brigadeiro Faria Lima', 'addr:suburb': 'Jardim Morumbi',
    'contact:phone': '+55 17 3216 9844', name: 'Riopreto Shopping',
    opening_hours: 'Mo-Sa 10:00-22:00; Su,PH 14:00-20:00', shop: 'mall', website: 'https://www.riopretoshopping.com.br/',
  },
};
const square = { type: 'way', id: 222566089, center: { lat: -20.81, lon: -49.38 }, tags: { leisure: 'park', name: 'Praça Rui Barbosa' } };
const unnamed = { type: 'node', id: 4971389521, lat: -20.78, lon: -49.39, tags: { amenity: 'pharmacy' } };
const theatre = { type: 'way', id: 515051094, center: { lat: -20.81, lon: -49.36 }, tags: { amenity: 'theatre', name: 'Teatro Municipal Paulo Moura' } };
const culvert = {
  type: 'way', id: 188199661,
  geometry: [{ lat: -20.8102672, lon: -49.3562511 }, { lat: -20.8102219, lon: -49.3566445 }],
  tags: { name: 'Rio Preto', tunnel: 'culvert', waterway: 'river' },
};
const river = {
  type: 'way', id: 188199663,
  geometry: [{ lat: -20.8102219, lon: -49.3566445 }, { lat: -20.8101371, lon: -49.3569128 }, { lat: -20.8099434, lon: -49.3573018 }],
  tags: { name: 'Rio Preto', waterway: 'river' },
};

test('maps an OSM node with address, phone and 24/7 hours', () => {
  assert.deepEqual(toPlace(pharmacy), {
    osmId: 'node/3897495209', category: 'pharmacy', name: 'Rio Pharma',
    street: 'Avenida Murchid Homsi, 1155', neighborhood: undefined,
    lat: -20.820812, lng: -49.365512, phone: '+55 17 3215 3030', website: undefined,
    hours: 'Open 24 hours', tags: ['24h'],
  });
});

test('maps a way by its center and keeps suburb, contact phone and website', () => {
  const place = toPlace(mall);
  assert.equal(place.osmId, 'way/227731153');
  assert.equal(place.category, 'mall');
  assert.equal(place.neighborhood, 'Jardim Morumbi');
  assert.equal(place.phone, '+55 17 3216 9844');
  assert.equal(place.website, 'https://www.riopretoshopping.com.br/');
  assert.equal(place.hours, 'Mo-Sa 10:00-22:00\nSu,PH 14:00-20:00');
  assert.deepEqual([place.lat, place.lng], [-20.835167, -49.398561]);
});

test('ignores unnamed places and parks that are not "Parque"', () => {
  assert.equal(toPlace(unnamed), null);
  assert.equal(toPlace(square), null);
  assert.equal(categoryFor(theatre.tags), 'culture');
});

test('a river becomes one point on its longest segment', () => {
  const places = placesFrom([culvert, river, pharmacy]);
  const rivers = places.filter((p) => p.category === 'water');
  assert.equal(rivers.length, 1);
  assert.equal(rivers[0].osmId, 'way/188199663');
  assert.deepEqual([rivers[0].lat, rivers[0].lng], [-20.810137, -49.356913]);
  assert.equal(places.length, 2);
});

test('query asks for centers of places and geometry of rivers', () => {
  const query = overpassQuery();
  assert.match(query, /nwr\["amenity"~"\^\(pharmacy\)\$"\]\["name"\]\(area\.a\);/);
  assert.match(query, /\(way\["waterway"~"\^\(river\)\$"\]\["name"\]\(area\.a\);\);out tags geom;$/);
});
