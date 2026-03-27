/**
 * SERVER INTEGRATION GUIDE - Applying Error Handling to routes.ts
 * 
 * This file shows EXACTLY where to add error handling to server/routes.ts
 * Copy these patterns and apply to your actual routes.
 */

// ============================================================================
// STEP 1: Add imports at the top of server/routes.ts
// ============================================================================

export const importsToAdd = `
// Add these imports at the top of server/routes.ts:

import { 
  asyncHandler, 
  AppError, 
  UnauthorizedError, 
  ForbiddenError,
  NotFoundError,
  errorHandler,
  notFoundHandler 
} from './middleware/errorHandler';

import {
  validateBody,
  sanitizeString,
  sanitizeNumber,
  isValidEmail,
  isValidSubscriptionStatus,
  isValidBillingFrequency
} from './middleware/validation';

import { z } from 'zod';

// Define validation schemas
const subscriptionCreateSchema = z.object({
  name: z.string().min(1).max(100),
  category: z.string(),
  amount: z.number().positive('Amount must be greater than 0'),
  frequency: z.string(),
  nextBillingDate: z.string(),
  currency: z.string().default('USD'),
  status: z.string().default('active'),
  description: z.string().optional(),
  websiteDomain: z.string().optional(),
});
`;

// ============================================================================
// STEP 2: Apply fixes to specific endpoints
// ============================================================================

export const endpointPatches = {
  // POST /api/subscriptions - CREATE subscription
  createSubscription: `
app.post('/api/subscriptions',
  validateBody(subscriptionCreateSchema),
  asyncHandler(async (req, res) => {
    const userId = req.session?.user?.id;
    if (!userId) {
      throw new UnauthorizedError('Must be logged in');
    }

    // Validate amount is positive
    const { amount, name, frequency, status, category } = req.body;
    
    if (amount <= 0) {
      throw new AppError(400, 'Subscription amount must be positive');
    }

    // Validate frequency
    if (!isValidBillingFrequency(frequency)) {
      throw new AppError(400, 'Invalid billing frequency');
    }

    // Validate status
    if (status && !isValidSubscriptionStatus(status)) {
      throw new AppError(400, 'Invalid subscription status');
    }

    // Sanitize inputs
    const sanitizedName = sanitizeString(name);
    
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('subscriptions')
      .insert([{
        id: randomUUID(),
        user_id: userId,
        name: sanitizedName,
        category,
        amount,
        frequency,
        next_billing_at: nextBillingDate,
        status: status || 'active',
        currency: currency || 'USD',
        created_at: new Date().toISOString(),
      }])
      .select();

    if (error) {
      throw new AppError(500, 'Failed to create subscription', { cause: error.message });
    }

    res.status(201).json(data[0]);
  })
);
  `,

  // GET /api/subscriptions - LIST subscriptions
  listSubscriptions: `
app.get('/api/subscriptions',
  asyncHandler(async (req, res) => {
    const userId = req.session?.user?.id;
    if (!userId) {
      throw new UnauthorizedError('Must be logged in');
    }

    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .neq('status', 'deleted') // Filter out deleted subscriptions
      .order('created_at', { ascending: false });

    if (error) {
      throw new AppError(500, 'Failed to fetch subscriptions');
    }

    res.json(data || []);
  })
);
  `,

  // DELETE /api/subscriptions/:id - DELETE subscription
  deleteSubscription: `
app.delete('/api/subscriptions/:id',
  asyncHandler(async (req, res) => {
    const userId = req.session?.user?.id;
    const { id } = req.params;
    
    if (!userId) {
      throw new UnauthorizedError('Must be logged in');
    }

    if (!id) {
      throw new AppError(400, 'Subscription ID is required');
    }

    const supabase = getSupabaseClient();
    
    // Verify ownership
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('user_id')
      .eq('id', id)
      .single();

    if (!subscription) {
      throw new NotFoundError('Subscription');
    }

    if (subscription.user_id !== userId) {
      throw new ForbiddenError('You can only delete your own subscriptions');
    }

    // Delete associated usage logs
    await supabase
      .from('usage_logs')
      .delete()
      .eq('subscription_id', id);

    // Soft delete the subscription (set status to 'deleted')
    const { error } = await supabase
      .from('subscriptions')
      .update({ status: 'deleted', deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      throw new AppError(500, 'Failed to delete subscription');
    }

    res.json({ success: true, message: 'Subscription deleted' });
  })
);
  `,

  // GET /api/family-groups/:id/family-data - FAMILY DATA with access control
  familyData: `
app.get('/api/family-groups/:id/family-data',
  asyncHandler(async (req, res) => {
    const userId = req.session?.user?.id;
    const { id } = req.params;
    
    if (!userId) {
      throw new UnauthorizedError('Must be logged in');
    }

    const supabase = getSupabaseClient();
    
    // Get current user's role in family group
    const { data: member, error: memberError } = await supabase
      .from('family_groups_members')
      .select('role')
      .eq('group_id', id)
      .eq('user_id', userId)
      .single();

    if (memberError || !member) {
      throw new ForbiddenError('You are not a member of this family group');
    }

    // Check if user has limited access
    if (member.role !== 'owner' && member.role !== 'admin') {
      throw new ForbiddenError('Only owners/admins can view full family data');
    }

    // Return family data
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*,family_groups_members(user_id,role)')
      .eq('family_group_id', id)
      .neq('status', 'deleted');

    if (error) {
      throw new AppError(500, 'Failed to fetch family data');
    }

    res.json(data || []);
  })
);
  `,
};

// ============================================================================
// STEP 3: Add error & notFound handlers at the END of routes.ts
// ============================================================================

export const endOfRoutesFile = `
// Add these at the VERY END of server/index.ts, AFTER all route definitions

import { errorHandler, notFoundHandler } from './middleware/errorHandler';

// 404 handler (must come before error handler)
app.use(notFoundHandler);

// Global error handler (must be LAST)
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(\`[Server] Running on http://localhost:\${PORT}\`);
});
`;

// ============================================================================
// STEP 4: Key patterns to follow
// ============================================================================

export const patterns = `
PATTERN 1: Validate before processing
------
if (!value) throw new AppError(400, 'Value is required');
if (value < 0) throw new AppError(400, 'Value must be positive');

PATTERN 2: Check authorization
------
if (!userId) throw new UnauthorizedError();
if (data.user_id !== userId) throw new ForbiddenError();

PATTERN 3: Handle Supabase errors
------
const { data, error } = await supabase...
if (error) throw new AppError(500, 'Operation failed', { cause: error.message });

PATTERN 4: Return proper status codes
------
201 - Created (POST successful)
200 - OK (GET, PUT successful)
204 - No Content (DELETE successful)
400 - Bad Request (validation error)
401 - Unauthorized (not logged in)
403 - Forbidden (no permission)
404 - Not Found (resource doesn't exist)
500 - Server Error (unexpected error)

PATTERN 5: Sanitize user input
------
const name = sanitizeString(req.body.name);
const amount = sanitizeNumber(req.body.amount);

PATTERN 6: Use asyncHandler for all async routes
------
app.get('/api/endpoint', asyncHandler(async (req, res) => {
  // No try-catch needed, errors are caught automatically
}));
`;

// ============================================================================
// STEP 5: Common mistakes to avoid
// ============================================================================

export const avoidThesePatterns = `
❌ DON'T:
- Catch errors silently: catch (e) { }
- Return HTML in error response
- Expose internal error messages to client
- Forget to validate user input
- Trust client data without checking
- Mix error handling patterns
- Use res.send() instead of res.json()

✅ DO:
- Use AppError with proper status code
- Log errors with context (userId, path, etc.)
- Return structured JSON error responses
- Validate ALL user input
- Check authorization before operations
- Sanitize string input
- Use consistent error format
`;

export default {
  importsToAdd,
  endpointPatches,
  endOfRoutesFile,
  patterns,
  avoidThesePatterns,
};
