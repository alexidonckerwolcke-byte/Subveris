# Sprint 1: Foundation & Security - Setup Guide

This document outlines all the improvements made to the codebase for Spring 1.

## What's New ✅

### 1. **Testing Framework** (Vitest)
- **Location:** `vitest.config.ts`, `tests/` directory
- **What it does:** Provides unit testing framework for critical functions
- **How to use:**
  ```bash
  npm run test              # Run tests once
  npm run test:ui          # Run tests with visual UI
  npm run test:coverage    # Generate coverage report
  ```

### 2. **Input Validation & Sanitization**
- **Location:** `server/middleware/validation.ts`
- **What it does:** Sanitizes user input and prevents injection attacks
- **Functions:**
  - `validateBody(schema)` - Middleware to validate request body
  - `sanitizeString(input)` - Remove dangerous characters from strings
  - `sanitizeNumber(input)` - Validate numeric input
  - `isValidEmail()`, `isValidUUID()` - Format validation helpers

### 3. **Error Handling**
- **Location:** `server/middleware/errorHandler.ts`, `client/src/components/error-boundary.tsx`
- **What it does:** Catches and properly handles errors throughout the app
- **Features:**
  - Global Express error handler
  - React Error Boundary component
  - Custom error classes (AppError, UnauthorizedError, etc.)
  - Proper error logging and user-friendly messages

### 4. **Test Suite**
- **Location:** `tests/` directory
- **Test files:**
  - `calculateMonthlyCost.test.ts` - Tests cost calculations
  - `normalizeMonthlySeries.test.ts` - Tests chart data normalization
  - `subscriptionCalculations.test.ts` - Tests savings/filtering logic

## How to Implement Error Handling in Routes

### Using the Error Handler Middleware

```typescript
import { asyncHandler, AppError } from './middleware/errorHandler';
import { validateBody } from './middleware/validation';

// In Express route:
app.post('/api/subscriptions',
  validateBody(subscriptionSchema),
  asyncHandler(async (req, res) => {
    // Validation errors are caught automatically
    
    // Throw custom errors
    if (!req.session?.user) {
      throw new UnauthorizedError('Must be logged in');
    }
    
    // Async errors are caught automatically
    const result = await supabase.from('subscriptions').insert(req.body);
    res.json(result);
  })
);

// At the END of all routes in server/index.ts:
import { errorHandler, notFoundHandler } from './middleware/errorHandler';

app.use(notFoundHandler);
app.use(errorHandler);
```

## How to Use Error Boundary in React

```typescript
import { ErrorBoundary } from '@/components/error-boundary';

// Wrap components that might error:
<ErrorBoundary>
  <YourComponent />
</ErrorBoundary>

// Custom fallback:
<ErrorBoundary fallback={(error, retry) => (
  <div>
    <p>Error: {error.message}</p>
    <button onClick={retry}>Try Again</button>
  </div>
)}>
  <YourComponent />
</ErrorBoundary>
```

## Next Steps for Immediate Implementation

1. **Add error handlers to key API routes:**
   - POST /api/subscriptions (validate amount > 0)
   - PUT /api/subscriptions/:id (prevent status tampering)
   - DELETE /api/subscriptions/:id (ensure proper cleanup)
   - GET /api/family-groups (check role-based access)

   ```bash
   cd server
   # Edit routes.ts to wrap key endpoints with asyncHandler
   # Import validation middleware
   ```

2. **Run the tests to verify function behavior:**
   ```bash
   npm run test calculateMonthlyCost.test.ts
   npm run test subscriptionCalculations.test.ts
   ```

3. **Add error boundaries to critical pages:**
   - /dashboard
   - /insights
   - /savings
   - /family-sharing

4. **Validate all inputs at API layer:**
   - Amount > 0
   - Name not empty
   - Status in allowed values
   - Date is valid

## Key Bug Fixes to Implement Next

From `docs/BUG_FIXES_SPRINT1.ts`:

1. **Filter deleted subscriptions** from all calculations
2. **Add amount validation** (no negative numbers)
3. **Implement role-based access** for family data
4. **Add null checks** in chart components
5. **Wrap API calls** with error handling
6. **Sanitize all user input**
7. **Add rate limiting** (express-rate-limit package)
8. **Ensure cascade deletes** work properly

## Testing the Setup

```bash
# Run all tests
npm run test

# Run specific test file
npm run test calculateMonthlyCost.test.ts

# Watch mode (re-run on file change)
npm run test -- --watch

# Coverage report
npm run test:coverage
```

## Important: Apply Error Handlers to Routes

This is CRITICAL for Sprint 1. Add to end of `server/index.ts`:

```typescript
import { errorHandler, notFoundHandler } from './middleware/errorHandler';

// ... all your routes ...

// Add these LAST
app.use(notFoundHandler);
app.use(errorHandler);
```

## Monitoring & Logs

Errors are logged with:
- Timestamp
- User ID (if logged in)
- Path and method
- Stack trace (in development only)

Check console for `[Error Handler]`, `[Validation]`, `[404 Not Found]` messages.

## Performance Note

Testing is included but optional for development. To skip tests during dev:
```bash
# Run app without watches
npm run dev
```

To run tests CI/CD pipeline (production):
```bash
npm run test -- --run
```

---

**Status:** Sprint 1 Foundation Complete ✅
**Next Phase:** Sprint 2 (Performance & Caching)
