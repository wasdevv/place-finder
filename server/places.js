import { Router } from 'express';
import mongoose from 'mongoose';
import Place from './place.js';
import { connect } from './db.js';
import { requireBearer } from './auth.js';
import {
  category, latitude, longitude, radiusKm, positiveInt, searchTerm, escapeRegex, placeInput, distanceKm,
} from './validation.js';

const router = Router();

const withDistance = (places, lat, lng) =>
  places.map((place) => {
    const [placeLng, placeLat] = place.location.coordinates;
    return { ...place, distance: distanceKm(lat, lng, placeLat, placeLng) };
  });

router.use(async (req, res, next) => {
  await connect();
  next();
});

router.get('/nearby', async (req, res) => {
  const lat = latitude(req.query.lat);
  const lng = longitude(req.query.lng);
  const radius = radiusKm(req.query.radiusKm);

  const kind = category(req.query.category);

  const places = await Place.find({
    stale: { $ne: true },
    ...(kind && { category: kind }),
    location: {
      $near: {
        $geometry: { type: 'Point', coordinates: [lng, lat] },
        $maxDistance: radius * 1000,
      },
    },
  })
    .limit(100)
    .lean();

  const data = withDistance(places, lat, lng);

  res.json({ data, count: data.length, radiusKm: radius });
});

router.get('/search', async (req, res) => {
  const pattern = new RegExp(escapeRegex(searchTerm(req.query.q)), 'i');
  const origin = req.query.lat !== undefined && req.query.lng !== undefined
    ? [latitude(req.query.lat), longitude(req.query.lng)]
    : null;
  const kind = category(req.query.category);
  const places = await Place.find({
    stale: { $ne: true },
    ...(kind && { category: kind }),
    $or: ['name', 'alternateName', 'neighborhood', 'city'].map((field) => ({ [field]: pattern })),
  })
    .sort({ name: 1, _id: 1 })
    .limit(50)
    .lean();

  const data = origin ? withDistance(places, ...origin) : places;

  res.json({ data, count: data.length });
});

router.get('/', async (req, res) => {
  const page = positiveInt(req.query.page, 'page', 1);
  const limit = positiveInt(req.query.limit, 'limit', 20, 100);

  const [total, data] = await Promise.all([
    Place.countDocuments({ stale: { $ne: true } }),
    Place.find({ stale: { $ne: true } }).sort({ createdAt: -1, _id: -1 }).skip((page - 1) * limit).limit(limit).lean(),
  ]);

  res.json({ data, count: data.length, total, page, pages: Math.ceil(total / limit) });
});

router.post('/', requireBearer('ADMIN_TOKEN'), async (req, res) => {
  const place = await Place.create(placeInput(req.body));
  res.status(201).json({ data: place });
});

router.get('/:id', async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ error: 'Invalid place id' });
  }
  const place = await Place.findById(req.params.id).lean();
  if (!place) return res.status(404).json({ error: 'Place not found' });
  res.json({ data: place });
});

export default router;
