import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ValidationError, category, latitude, longitude, radiusKm, positiveInt, searchTerm, escapeRegex, placeInput, distanceKm,
} from './validation.js';

const base = { name: 'A', category: 'mall', address: 'B', neighborhood: 'C', city: 'D', lat: 0, lng: 0 };

test('coordinates accept zero and reject out of range or non-finite', () => {
  assert.equal(latitude('0'), 0);
  assert.equal(longitude(0), 0);
  assert.equal(latitude('-90'), -90);
  for (const bad of ['91', 'abc', 'Infinity', '', undefined]) assert.throws(() => latitude(bad), ValidationError);
  assert.throws(() => longitude('180.1'), ValidationError);
});

test('radius defaults to 5 and is bounded', () => {
  assert.equal(radiusKm(undefined), 5);
  assert.equal(radiusKm('2.5'), 2.5);
  for (const bad of ['0', '-1', '51', 'NaN']) assert.throws(() => radiusKm(bad), ValidationError);
});

test('pagination is a positive integer capped at max', () => {
  assert.equal(positiveInt(undefined, 'page', 1), 1);
  assert.equal(positiveInt('500', 'limit', 20, 100), 100);
  for (const bad of ['0', '1.5', 'x']) assert.throws(() => positiveInt(bad, 'page', 1), ValidationError);
});

test('search term is trimmed and regex is treated as text', () => {
  assert.equal(searchTerm('  gulberg '), 'gulberg');
  assert.throws(() => searchTerm('   '), ValidationError);
  assert.throws(() => searchTerm('x'.repeat(101)), ValidationError);
  assert.ok(new RegExp(escapeRegex('.*[')).test('a.*[b'));
  assert.ok(!new RegExp(escapeRegex('.*')).test('abc'));
});

test('place input keeps only allowed fields and orders coordinates as [lng, lat]', () => {
  const place = placeInput({ ...base, lat: -20.8, lng: -49.3, rating: 0, tags: [' AC '], _id: 'x', isAdmin: true });
  assert.deepEqual(place.location, { type: 'Point', coordinates: [-49.3, -20.8] });
  assert.equal(place.rating, 0);
  assert.deepEqual(place.tags, ['AC']);
  assert.equal(place._id, undefined);
  assert.equal(place.isAdmin, undefined);
});

test('place input rejects invalid values', () => {
  for (const patch of [
    { name: '  ' }, { lat: '91' }, { lng: undefined }, { rating: 6 }, { rating: '4' },
    { tags: 'AC' }, { tags: [1] }, { website: 'javascript:alert(1)' }, { city: 5 },
  ]) {
    assert.throws(() => placeInput({ ...base, ...patch }), ValidationError, JSON.stringify(patch));
  }
  assert.throws(() => placeInput([]), ValidationError);
  assert.throws(() => placeInput({ ...base, category: undefined }), ValidationError);
  assert.throws(() => placeInput({ ...base, category: 'casino' }), ValidationError);
});

test('category filter is optional but must be known', () => {
  assert.equal(category(''), undefined);
  assert.equal(category('zoo'), 'zoo');
  assert.throws(() => category('__proto__'), ValidationError);
});

test('haversine distance', () => {
  assert.equal(distanceKm(1, 1, 1, 1), 0);
  assert.ok(Math.abs(distanceKm(0, 0, 0, 1) - 111.19) < 0.01);
});
