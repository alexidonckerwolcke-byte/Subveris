import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

/**
 * Validation middleware to sanitize and validate incoming request data
 */
export interface ValidationError {
  field: string;
  message: string;
}

/**
 * Create a validation middleware for body data
 */
export function validateBody(schema: z.ZodSchema) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validatedData = await schema.parseAsync(req.body);
      req.body = validatedData;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const formattedErrors = error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }));
        return res.status(400).json({
          error: 'Validation failed',
          details: formattedErrors,
        });
      }
      next(error);
    }
  };
}

/**
 * Sanitize string input to prevent injection attacks
 */
export function sanitizeString(input: string): string {
  if (!input || typeof input !== 'string') return '';
  
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove angle brackets to prevent HTML/XML injection
    .slice(0, 1000); // Limit length
}

/**
 * Sanitize numeric input
 */
export function sanitizeNumber(input: any): number | null {
  const num = parseFloat(input);
  if (isNaN(num)) return null;
  
  // Prevent extremely large numbers
  if (Math.abs(num) > 1e10) return null;
  
  return num;
}

/**
 * Validate UUID format
 */
export function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate subscription status
 */
export function isValidSubscriptionStatus(status: string): boolean {
  const validStatuses = ['active', 'unused', 'to-cancel', 'deleted'];
  return validStatuses.includes(status.toLowerCase());
}

/**
 * Validate billing frequency
 */
export function isValidBillingFrequency(frequency: string): boolean {
  const validFrequencies = ['monthly', 'yearly', 'weekly', 'quarterly'];
  return validFrequencies.includes(frequency.toLowerCase());
}

/**
 * Middleware to log validation requests (for debugging)
 */
export function logValidationRequest(req: Request, res: Response, next: NextFunction) {
  console.log(`[Validation] ${req.method} ${req.path}`, {
    timestamp: new Date().toISOString(),
    userId: (req as any).session?.user?.id || 'anonymous',
    bodyKeys: Object.keys(req.body).slice(0, 10),
  });
  next();
}
