import { createHash, timingSafeEqual } from 'node:crypto';

const digest = (value) => createHash('sha256').update(value).digest();

export const requireBearer = (name) => (req, res, next) => {
  const secret = process.env[name];
  if (!secret) return res.status(503).json({ error: `${name} is not configured` });
  const given = req.get('authorization')?.replace(/^Bearer /, '') ?? '';
  if (!timingSafeEqual(digest(given), digest(secret))) return res.status(401).json({ error: 'Unauthorized' });
  next();
};
