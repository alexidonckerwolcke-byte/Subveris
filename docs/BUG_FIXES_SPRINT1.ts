/**
 * BUG FIX GUIDE - Sprint 1: Foundation & Security
 * This file documents critical bugs and their fixes
 */

// ==============================================================================
// BUG #1: Deleted subscriptions appearing in calculations
// ==============================================================================
// ISSUE: Subscriptions with status='deleted' are included in spending/savings calculations
// IMPACT: Users see inflated spending and savings numbers
// SOLUTION: Add status filter to all subscription queries

const bugFix1 = `
// In /server/routes.ts - Fixed /api/spending/monthly endpoint
subscriptions.forEach(sub => {
  // FIX: Filter out deleted and to-cancel subscriptions
  if (sub.status === 'deleted' || sub.status === 'canceled') return;
  
  // Rest of calculation...
});
`;

// ==============================================================================
// BUG #2: Negative spending amounts not validated
// ==============================================================================
// ISSUE: Negative subscription amounts can be created, breaking calculations
// IMPACT: False savings calculations, corrupted financial data
// SOLUTION: Add validation to reject negative amounts

const bugFix2 = `
// Add to /server/routes.ts - POST /api/subscriptions
if (amount < 0) {
  throw new AppError(400, 'Subscription amount must be positive');
}
`;

// ==============================================================================
// BUG #3: Family data sharing exposes member subscriptions incorrectly
// ==============================================================================
// ISSUE: Family members can see data they shouldn't have access to
// IMPACT: Privacy/security issue
// SOLUTION: Add role-based access control

const bugFix3 = `
// Add to /server/routes.ts - GET /api/family-groups/:id/family-data
const canAccess = member.role === 'owner' || member.role === 'admin';
if (!canAccess) {
  throw new ForbiddenError('Insufficient permissions to access family data');
}
`;

// ==============================================================================
// BUG #4: Charts crash with undefined data
// ==============================================================================
// ISSUE: If API returns null/undefined, charts throw errors
// IMPACT: Page crashes, poor UX
// SOLUTION: Add null checks and default values

const bugFix4 = `
// In /client/src/pages/dashboard.tsx
const monthlyData = chartMonthlyData ?? [];
const categoryData = categorySpending ?? [];

// In component props
monthlyData={monthlyData || []}
categoryData={categoryData || []}
`;

// ==============================================================================
// BUG #5: No error handling for failed API calls
// ==============================================================================
// ISSUE: Failed API requests show 404 or raw error messages
// IMPACT: Poor user experience, confusion
// SOLUTION: Add global error handler and user-friendly messages

const bugFix5 = `
// Use asyncHandler wrapper in Express
import { asyncHandler } from './middleware/errorHandler';

app.get('/api/subscriptions', asyncHandler(async (req, res) => {
  try {
    const { data, error } = await supabase...
    if (error) throw error;
    res.json(data);
  } catch (error) {
    throw new AppError(500, 'Failed to fetch subscriptions', { cause: error });
  }
}));
`;

// ==============================================================================
// BUG #6: Unsanitized user input can cause injection attacks
// ==============================================================================
// ISSUE: Subscription names and descriptions not sanitized
// IMPACT: XSS vulnerability
// SOLUTION: Use validation middleware

const bugFix6 = `
// In /server/routes.ts
import { validateBody, sanitizeString } from './middleware/validation';

app.post('/api/subscriptions', 
  validateBody(subscriptionSchema),
  (req, res) => {
    req.body.name = sanitizeString(req.body.name);
    req.body.description = sanitizeString(req.body.description);
    // Rest of handler...
  }
);
`;

// ==============================================================================
// BUG #7: No rate limiting on API endpoints
// ==============================================================================
// ISSUE: No protection against brute force or abuse
// IMPACT: API can be DoS attacked
// SOLUTION: Add rate limiting middleware (to implement separately)

const bugFix7 = `
// TODO: Install rate-limit package
// npm install express-rate-limit
// Then add to server/index.ts:

import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

app.use('/api/', limiter);
`;

// ==============================================================================
// BUG #8: Missing checks for deleted resources
// ==============================================================================
// ISSUE: Can't properly clean up cascading deletes
// IMPACT: Orphaned data, inconsistent state
// SOLUTION: Add proper cascade delete logic

const bugFix8 = `
// When deleting a subscription, ensure:
1. Remove all usage logs for that subscription
2. Remove from family data views
3. Recalculate metrics for all family members
4. Log the deletion for audit trail
`;

// ==============================================================================
// VALIDATION SCHEMAS for input sanitization
// ==============================================================================

export const subscriptionValidationSchema = `
import { z } from 'zod';

export const subscriptionSchema = z.object({
  name: z.string()
    .min(1, 'Name is required')
    .max(100, 'Name must be 100 characters or less')
    .trim(),
  
  category: z.enum([
    'streaming', 'software', 'fitness', 'cloud-storage', 
    'news', 'gaming', 'productivity', 'finance', 'education', 'other'
  ]),
  
  amount: z.number()
    .positive('Amount must be greater than 0')
    .max(99999.99, 'Amount must be less than $99,999.99')
    .finite(),
  
  frequency: z.enum(['monthly', 'yearly', 'weekly', 'quarterly']),
  
  currency: z.string()
    .length(3, 'Currency must be ISO 4217 code')
    .toUpperCase(),
  
  nextBillingDate: z.string()
    .datetime('Must be valid ISO date'),
  
  description: z.string()
    .max(500, 'Description must be 500 characters or less')
    .optional(),
  
  websiteDomain: z.string()
    .url('Must be valid URL')
    .optional(),
  
  status: z.enum(['active', 'unused', 'to-cancel', 'deleted'])
    .default('active'),
});
`;

// ==============================================================================
// ERROR HANDLING BEST PRACTICES
// ==============================================================================

export const errorHandlingGuide = `
PATTERNS TO FOLLOW:

1. In React components:
   - Wrap with <ErrorBoundary>
   - Use try-catch in event handlers
   - Show user-friendly error messages
   
2. In Express routes:
   - Use asyncHandler to catch promise rejections
   - Throw AppError with statusCode and message
   - Never expose internal error details
   
3. In queries:
   - Always check for error response
   - Set sensible defaults for missing data
   - Show loading states

EXAMPLE:
try {
  const data = await fetchSubscriptions();
  setSubscriptions(data ?? []);
} catch (error) {
  showErrorToast('Failed to load subscriptions. Please try again.');
  console.error('Detailed error:', error);
}
`;

export default {
  bugFix1,
  bugFix2,
  bugFix3,
  bugFix4,
  bugFix5,
  bugFix6,
  bugFix7,
  bugFix8,
};
