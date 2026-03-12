import { Request, Response, NextFunction } from 'express';
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', { maxRetriesPerRequest: null });

export const idempotency = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const idempotencyKey = req.headers['x-idempotency-key'] as string;

  if (!idempotencyKey) {
    res.status(400).json({ error: 'Idempotency key is required' });
    return;
  }

  const key = `idempotency:${idempotencyKey}`;
  const cachedResponse = await redis.get(key);

  if (cachedResponse) {
    res.status(200).json(JSON.parse(cachedResponse));
    return;
  }

  const originalJson = res.json;
  res.json = function (body) {
    if (res.statusCode >= 200 && res.statusCode < 300) {
      redis.setex(key, 86400, JSON.stringify(body));
    }
    return originalJson.call(this, body);
  };

  next();
};
