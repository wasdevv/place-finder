import express from 'express';
import mongoose from 'mongoose';
import places from './places.js';
import { connect } from './db.js';

const app = express();

app.disable('x-powered-by');
app.use(express.json({ limit: '10kb' }));

app.get('/api/health', async (req, res) => {
  await connect();
  await mongoose.connection.db.admin().ping();
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/places', places);

app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.use((error, req, res, next) => {
  if (error.type === 'entity.parse.failed') return res.status(400).json({ error: 'Malformed JSON' });
  if (error.type === 'entity.too.large') return res.status(413).json({ error: 'Payload too large' });
  if (error.name === 'ValidationError') return res.status(400).json({ error: error.message });
  if (error.status === 503 || error.name?.startsWith('MongoServerSelection')) {
    console.error(error);
    return res.status(503).json({ error: 'Database unavailable' });
  }
  if (error.status >= 400 && error.status < 500) return res.status(error.status).json({ error: error.message });
  console.error(error);
  res.status(500).json({ error: 'Internal server error' });
});

export default app;
