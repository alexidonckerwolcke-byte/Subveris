import { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// __dirname is not available in ESM; compute from import.meta.url
const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Custom error class for application errors
 */
export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = 'AppError';
  }
}

/**
 * Standard error response format
 */
export interface ErrorResponse {
  error: string;
  message: string;
  statusCode: number;
  timestamp: string;
  path?: string;
  details?: Record<string, any>;
}

/**
 * Global error handling middleware for Express
 * Should be added LAST in the middleware chain
 */
export function errorHandler(
  err: Error | AppError | any,
  req: Request,
  res: Response,
  next: NextFunction
) {
  const timestamp = new Date().toISOString();
  
  // Log the error for debugging
  console.error('[Error Handler]', {
    timestamp,
    path: req.path,
    method: req.method,
    userId: (req as any).session?.user?.id || 'anonymous',
    error: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    statusCode: err.statusCode || 500,
  });

  // Handle AppError (custom application errors)
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: err.message,
      message: err.message,
      statusCode: err.statusCode,
      timestamp,
      path: req.path,
      details: err.details,
    } as ErrorResponse);
  }

  // Handle Zod validation errors
  if (err.name === 'ZodError') {
    return res.status(400).json({
      error: 'Validation failed',
      message: 'Request validation failed',
      statusCode: 400,
      timestamp,
      path: req.path,
      details: err.errors?.slice(0, 5), // Limit to first 5 errors
    } as ErrorResponse);
  }

  // Handle JSON parsing errors
  if (err instanceof SyntaxError && 'body' in err) {
    return res.status(400).json({
      error: 'Invalid JSON',
      message: 'Request body contains invalid JSON',
      statusCode: 400,
      timestamp,
      path: req.path,
    } as ErrorResponse);
  }

  // Handle generic errors
  const statusCode = err.statusCode || err.status || 500;
  const message = err.message || 'Internal server error';

  res.status(statusCode).json({
    error: message,
    message: process.env.NODE_ENV === 'production' 
      ? 'An error occurred processing your request' 
      : message,
    statusCode,
    timestamp,
    path: req.path,
  } as ErrorResponse);
}

/**
 * 404 Not Found handler
 * Should be added near the end of middleware chain but before error handler
 */
export function notFoundHandler(req: Request, res: Response) {
  const timestamp = new Date().toISOString();

  console.warn('[404 Not Found]', {
    timestamp,
    path: req.path,
    method: req.method,
    userId: (req as any).session?.user?.id || 'anonymous',
  });

  // For API routes, return JSON error
  if (req.path.startsWith('/api/')) {
    res.status(404).json({
      error: 'Not found',
      message: `Route ${req.method} ${req.path} not found`,
      statusCode: 404,
      timestamp,
      path: req.path,
    } as ErrorResponse);
    return;
  }

  // For SPA routes, serve index.html to let the client handle routing
  const indexPath = path.resolve(__dirname, '../../dist/public/index.html');

  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    // Fallback if index.html doesn't exist
    res.status(404).json({
      error: 'Not found',
      message: `Route ${req.method} ${req.path} not found`,
      statusCode: 404,
      timestamp,
      path: req.path,
    } as ErrorResponse);
  }
}

/**
 * Async route wrapper to catch errors in async route handlers
 * Usage: app.get('/route', asyncHandler(async (req, res) => { ... }))
 */
export function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Rate limiting error handler
 */
export class RateLimitError extends AppError {
  constructor(message: string = 'Too many requests. Please try again later.') {
    super(429, message);
    this.name = 'RateLimitError';
  }
}

/**
 * Unauthorized error handler
 */
export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized: Authentication required') {
    super(401, message);
    this.name = 'UnauthorizedError';
  }
}

/**
 * Forbidden error handler
 */
export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden: Access denied') {
    super(403, message);
    this.name = 'ForbiddenError';
  }
}

/**
 * Not Found error handler
 */
export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource') {
    super(404, `${resource} not found`);
    this.name = 'NotFoundError';
  }
}
