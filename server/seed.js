import mongoose from 'mongoose';
import Place from './place.js';
import { connect } from './db.js';
import { placeInput } from './validation.js';
import places from './seed-places.json' with { type: 'json' };

if (!process.argv.includes('--replace')) {
  console.error('This deletes every place first. Run with --replace to confirm: npm run seed -- --replace');
  process.exit(1);
}

try {
  await connect();
  await Place.syncIndexes();
  await Place.deleteMany({});
  const inserted = await Place.insertMany(places.map(placeInput));
  console.log(`Inserted ${inserted.length} places`);
} catch (error) {
  console.error('Seed failed:', error.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
