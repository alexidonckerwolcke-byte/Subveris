import { type Request, type Response, type NextFunction } from 'express';
import { logger } from './logger';

export function logRequest(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info({
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      duration
    }, 'request');
  });
  next();
}
