import { Request, Response, NextFunction } from 'express';
import { generateRequestId } from '../utils/codes';
import { captureException } from '../services/telemetry';

export function requestIdMiddleware(req: Request, _res: Response, next: NextFunction) {
  req.requestId = (req.headers['x-request-id'] as string) || generateRequestId();
  next();
}

export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction) {
  void captureException(err, {
    request_id: req.requestId,
    route: `${req.method} ${req.originalUrl}`,
    actor_id: req.user?.id,
    actor_role: req.user?.role,
    ip: req.ip,
  });
  console.error(`[ERROR] ${req.requestId} ${err.message}`, err.stack);
  res.status(500).json({
    error: 'Internal server error',
    request_id: req.requestId,
  });
}

export function notFound(_req: Request, res: Response) {
  res.status(404).json({ error: 'Not found' });
}
