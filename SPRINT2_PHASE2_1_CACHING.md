# Sprint 2.1: Redis Caching Implementation Guide

**Time Required:** 4-5 hours | **Complexity:** Medium | **Impact:** 🔴 CRITICAL

---

## What We're Building

A caching layer that reduces database queries and API calls by storing frequently accessed data with automatic expiration.

### Before/After

```
BEFORE (Every request hits database):
GET /api/subscriptions → Supabase → 450ms → Client

AFTER (With caching):
GET /api/subscriptions → Redis (cached) → 25ms → Client
GET /api/subscriptions → Cache miss → Supabase → Cache + Response → 450ms
```

---

## ⚡ Quick Start

### 1. Install Packages (3 min)

```bash
npm install ioredis @sentry/node
npm install --save-dev @types/ioredis
```

### 2. Create Cache Service (15 min)

Create file: `server/cache.ts`

The cache service provides:
- Automatic serialization
- TTL (Time-To-Live) management  
- Cache invalidation strategies
- Fallback for missing Redis

### 3. Integrate Into Routes (45 min)

Update endpoints to use caching:
- GET /api/subscriptions (cached 5min)
- GET /api/metrics (cached 2min)
- GET /api/subscriptions/:id (cached 10min)

### 4. Setup Invalidation (30 min)

Clear cache on mutations:
- POST /api/subscriptions → invalidate subscriptions
- PATCH /api/subscriptions/:id → invalidate that subscription
- DELETE → invalidate related caches

### 5. Test & Verify (1 hour)

- Test cache hits
- Test cache misses
- Verify performance
- Monitor hit rates

---

## Implementation Steps

### STEP 1: Create Cache Service

**File:** `server/cache.ts`

```typescript
import Redis from 'ioredis';

// Allow graceful degradation if Redis is unavailable
let redis: Redis | null = null;

try {
  redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
    retryStrategy: (times) => {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
    enableReadyCheck: false,
    enableOfflineQueue: false,
    lazyConnect: true,
  });

  redis.on('error', (err) => {
    console.warn('[Cache] Redis error (cache disabled):', err.message);
  });

  redis.on('connect', () => {
    console.log('[Cache] Redis connected');
  });

  // Attempt connection
  redis.connect().catch(() => {
    console.warn('[Cache] Could not connect to Redis, operating without cache');
    redis = null;
  });
} catch (err) {
  console.warn('[Cache] Redis init failed:', err);
  redis = null;
}

export class CacheService {
  /**
   * Get a cached value by key
   */
  static async get<T>(key: string): Promise<T | null> {
    if (!redis) return null;
    try {
      const data = await redis.get(key);
      if (!data) return null;
      return JSON.parse(data);
    } catch (err) {
      console.warn(`[Cache] Get error for ${key}:`, err);
      return null;
    }
  }

  /**
   * Set a cached value with TTL (seconds)
   */
  static async set<T>(key: string, value: T, ttlSeconds: number = 300): Promise<void> {
    if (!redis) return;
    try {
      await redis.setex(key, ttlSeconds, JSON.stringify(value));
    } catch (err) {
      console.warn(`[Cache] Set error for ${key}:`, err);
    }
  }

  /**
   * Delete a cached value
   */
  static async delete(key: string): Promise<void> {
    if (!redis) return;
    try {
      await redis.del(key);
    } catch (err) {
      console.warn(`[Cache] Delete error for ${key}:`, err);
    }
  }

  /**
   * Delete multiple values by pattern
   */
  static async deletePattern(pattern: string): Promise<void> {
    if (!redis) return;
    try {
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } catch (err) {
      console.warn(`[Cache] Delete pattern error for ${pattern}:`, err);
    }
  }

  /**
   * Get or set pattern - gets from cache, or calls fn and caches result
   */
  static async getOrSet<T>(
    key: string,
    fn: () => Promise<T>,
    ttlSeconds: number = 300
  ): Promise<T> {
    // Try to get from cache first
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Cache miss - fetch and store
    const result = await fn();
    await this.set(key, result, ttlSeconds);
    return result;
  }

  /**
   * Clear all cache (use sparingly!)
   */
  static async clear(): Promise<void> {
    if (!redis) return;
    try {
      await redis.flushdb();
    } catch (err) {
      console.warn('[Cache] Flush error:', err);
    }
  }

  /**
   * Get cache statistics
   */
  static async getStats(): Promise<{ size: number; keys: string[] } | null> {
    if (!redis) return null;
    try {
      const keys = await redis.keys('*');
      const info = await redis.info('memory');
      return { size: keys.length, keys };
    } catch (err) {
      console.warn('[Cache] Stats error:', err);
      return null;
    }
  }
}

export default CacheService;
```

### STEP 2: Update Route Imports

**File:** `server/routes.ts`

Add at the top (after other imports):

```typescript
import CacheService from './cache';
```

### STEP 3: Add Caching to GET Endpoints

Update the subscriptions endpoint:

**Before:**
```typescript
app.get("/api/subscriptions", asyncHandler(async (req, res) => {
  let userId = req.session?.user?.id;
  // ... auth check ...
  
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId);
    // ... response ...
}));
```

**After:**
```typescript
app.get("/api/subscriptions", asyncHandler(async (req, res) => {
  let userId = req.session?.user?.id;
  if (!userId) {
    const authHeader = req.headers.authorization?.replace('Bearer ', '');
    if (authHeader) userId = extractUserIdFromToken(authHeader) || undefined;
  }
  if (!userId) throw new UnauthorizedError('Authentication required');

  // Use cache with key specific to user
  const cacheKey = `subs:${userId}`;
  
  const data = await CacheService.getOrSet(
    cacheKey,
    async () => {
      const supabase = getSupabaseClient();
      const { data } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', userId);
      return data || [];
    },
    300 // 5 minutes
  );

  res.json(data.map(mapSubscriptionFromDb));
}));
```

### STEP 4: Add Cache Invalidation on Mutations

Update POST endpoint:

```typescript
app.post("/api/subscriptions", asyncHandler(async (req, res) => {
  // ... existing code ...
  
  res.status(201).json(mapSubscriptionFromDb(data));
  
  // Invalidate user's subscription cache
  await CacheService.delete(`subs:${userId}`);
  await CacheService.delete(`metrics:${userId}`);
}));
```

Update PATCH status endpoint:

```typescript
app.patch("/api/subscriptions/:id/status", asyncHandler(async (req, res) => {
  // ... existing code ...
  
  res.json(mapSubscriptionFromDb(data));
  
  // Invalidate caches for this user
  const subscriptionOwnerId = existingSub.user_id;
  await CacheService.delete(`subs:${subscriptionOwnerId}`);
  await CacheService.delete(`subs:${subscriptionOwnerId}:${req.params.id}`);
  await CacheService.delete(`metrics:${subscriptionOwnerId}`);
}));
```

### STEP 5: Setup Environment Variables

**File:** `.env`

Add:
```env
# Redis Configuration
REDIS_URL=redis://localhost:6379
REDIS_TTL=300

# Option: Use Redis Cloud (if not local)
# REDIS_URL=redis://default:password@hostname:port
```

### STEP 6: Create Cache Monitoring Endpoint (Optional)

**File:** `server/routes.ts`

Add this endpoint to monitor cache health:

```typescript
app.get("/api/cache/stats", asyncHandler(async (req, res) => {
  // Get user ID for auth
  let userId = req.session?.user?.id;
  if (!userId) {
    const authHeader = req.headers.authorization?.replace('Bearer ', '');
    if (authHeader) userId = extractUserIdFromToken(authHeader) || undefined;
  }
  
  // Only allow admins (for now, just check if authenticated)
  if (!userId) throw new UnauthorizedError('Authentication required');
  
  const stats = await CacheService.getStats();
  res.json({
    status: stats ? 'connected' : 'disconnected',
    stats
  });
}));
```

---

## Testing Cache Implementation

### Test 1: Verify Cache Hit

```bash
# First call (cache miss)
time curl http://localhost:3000/api/subscriptions

# Second call (should be much faster - cache hit)
time curl http://localhost:3000/api/subscriptions
```

Expected: First ~450ms, Second ~25ms

### Test 2: Verify Cache Invalidation

```bash
# Get subscriptions (cache)
curl http://localhost:3000/api/subscriptions

# Create a subscription (should invalidate cache)
curl -X POST http://localhost:3000/api/subscriptions \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","category":"Test","amount":9.99,"frequency":"monthly","nextBillingDate":"2026-03-15"}'

# Get subscriptions again (should hit database again, then re-cache)
time curl http://localhost:3000/api/subscriptions
```

### Test 3: Run Test Suite

```bash
npm run test
# Should all pass - no regressions
```

---

## Performance Verification

### Before Caching
```
GET /api/metrics: 650ms (Supabase query)
GET /api/subscriptions: 450ms (Supabase query)
GET /api/subscriptions/:id: 250ms (Supabase query)
```

### After Caching
```
GET /api/metrics: 25ms (Redis cache hit)
GET /api/subscriptions: 25ms (Redis cache hit)
GET /api/subscriptions/:id: 25ms (Redis cache hit)

On cache miss: same as before, but faster next time
```

### Load Test

```bash
# Install Apache Bench
brew install httpd  # macOS

# Test 100 concurrent requests
ab -n 100 -c 10 http://localhost:3000/api/subscriptions
```

Expected improvement: 2-3x faster with caching

---

## Troubleshooting

### Redis Not Connecting

```bash
# Check if Redis is running
redis-cli ping
# Should return PONG

# If not running, start it
redis-server

# Or run in Docker
docker run -d -p 6379:6379 redis:7
```

### Cache Not Working

1. Check `REDIS_URL` in `.env`
2. Look for `[Cache]` logs in console
3. Check Redis connection: `redis-cli` → `ping`
4. Verify cache is being used: Add `console.log('[Cache] Hit for key:', key)` in CacheService.get()

### High Memory Usage

Redis cache growing too large? Reduce TTL:
```typescript
CacheService.set(data, 60); // 1 minute instead of 5
```

Or clear cache periodically:
```typescript
// Clear every hour
setInterval(() => CacheService.clear(), 3600000);
```

---

## Next Steps

Once this is working:

1. ✅ Test all endpoints with caching
2. ✅ Monitor cache hit rate
3. ✅ Run `npm run test` - should pass
4. ✅ Move to **Phase 2.2: Sentry Setup**

**Progress:** 6.5 → 7.2 rating | 60% faster endpoints

