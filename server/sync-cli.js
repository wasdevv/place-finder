import mongoose from 'mongoose';
import Place from './place.js';
import { connect } from './db.js';
import { sync } from './sync.js';

try {
  await connect();
  await Place.syncIndexes();
  console.log('Syncing with OpenStreetMap, new places take about a second each…');
  console.log(await sync({ replace: process.argv.includes('--replace') }));
} catch (error) {
  console.error('Sync failed:', error.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
