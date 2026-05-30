import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import zlib from 'zlib';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = process.env.PORT || 3000;
const DIST_PATH = path.join(__dirname, 'public');

// Initialize Supabase
const supabaseUrl = 'https://xuilgccacufwinvkocfl.supabase.co';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

let supabase = null;
if (supabaseServiceRoleKey) {
  supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
  console.log('✓ Supabase initialized with service role key');
} else {
  console.warn('⚠ SUPABASE_SERVICE_ROLE_KEY not set - API endpoints will not work');
}

// Helper to parse JSON body
const parseBody = (req) => {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        resolve({});
      }
    });
  });
};

// Helper to read raw body bytes for proxying
const parseRawBody = (req) => {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
};

const REMOTE_API_BASE = process.env.VITE_API_URL || process.env.SUPABASE_API_URL || process.env.SUPABASE_FUNCTIONS_URL || '';
const STRIPE_PREMIUM_PRICE_ID = process.env.STRIPE_PREMIUM_PRICE_ID || process.env.VITE_STRIPE_PREMIUM_PRICE_ID || '';
const STRIPE_FAMILY_PRICE_ID = process.env.STRIPE_FAMILY_PRICE_ID || process.env.VITE_STRIPE_FAMILY_PRICE_ID || '';

console.log('[Startup] Stripe Price IDs loaded:', {
  premium: STRIPE_PREMIUM_PRICE_ID ? '✓ set' : '✗ NOT SET',
  family: STRIPE_FAMILY_PRICE_ID ? '✓ set' : '✗ NOT SET',
  premium_value: STRIPE_PREMIUM_PRICE_ID || 'undefined',
  family_value: STRIPE_FAMILY_PRICE_ID || 'undefined'
});

async function proxyStripeRequest(req, res, pathSuffix) {
  if (!REMOTE_API_BASE) {
    return false;
  }

  const remoteUrl = `${REMOTE_API_BASE.replace(/\/$/, '')}/${pathSuffix.replace(/^\//, '')}`;
  const headers = {};
  for (const [key, value] of Object.entries(req.headers)) {
    if (!value) continue;
    if (key === 'host') continue;
    if (key.toLowerCase() === 'content-encoding') continue; // Skip content-encoding to prevent decoding issues
    headers[key] = value;
  }

  let body = null;
  if (req.method !== 'GET' && req.method !== 'HEAD' && req.method !== 'OPTIONS') {
    const rawBody = await parseRawBody(req);
    body = rawBody.length ? rawBody : null;
    if (body) {
      headers['content-length'] = body.length;
    }
  }

  try {
    console.log(`[Proxy] ${req.method} ${remoteUrl}`, { bodyLength: body?.length });
    const remoteRes = await fetch(remoteUrl, {
      method: req.method,
      headers,
      body,
    });

    let responseBody = await remoteRes.arrayBuffer();
    
    // Handle gzip compression
    const contentEncoding = remoteRes.headers.get('content-encoding');
    if (contentEncoding === 'gzip') {
      console.log(`[Proxy] Decompressing gzip response`);
      responseBody = await new Promise((resolve, reject) => {
        zlib.gunzip(Buffer.from(responseBody), (err, result) => {
          if (err) reject(err);
          else resolve(result.buffer);
        });
      });
    }

    const bodyText = Buffer.from(responseBody).toString('utf-8');
    
    console.log(`[Proxy Response] Status: ${remoteRes.status}, Length: ${responseBody.byteLength}, Preview: ${bodyText.substring(0, 200)}`);

    const responseHeaders = {};
    remoteRes.headers.forEach((value, key) => {
      if (key.toLowerCase() === 'transfer-encoding') return;
      if (key.toLowerCase() === 'content-encoding') return; // Remove encoding since we decompressed
      responseHeaders[key] = value;
    });

    if (!remoteRes.ok) {
      console.error(`[Proxy Error] ${remoteRes.status} from ${remoteUrl}:`, bodyText);
    }

    // Ensure content-length is set correctly
    responseHeaders['content-length'] = responseBody.byteLength;
    
    res.writeHead(remoteRes.status, responseHeaders);
    res.end(Buffer.from(responseBody));
    return true;
  } catch (error) {
    console.error('Error proxying request to remote API:', error.message);
    res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Failed to proxy request' }));
    return true;
  }
}

// Helper to extract and verify JWT token
const getUser = async (authHeader) => {
  if (!supabase) return null;
  if (!authHeader?.startsWith('Bearer ')) return null;
  
  const token = authHeader.slice(7);
  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    return error ? null : user;
  } catch {
    return null;
  }
};

const server = http.createServer(async (req, res) => {
  // Remove query strings and hash
  let urlPath = req.url.split('?')[0].split('#')[0];
  
  // Debug logging for ALL requests
  console.log(`[${new Date().toISOString()}] [${req.method}] ${req.url} → urlPath="${urlPath}"`);
  
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // API Routes - MUST be checked before static file serving
  if (urlPath.startsWith('/api/')) {
    console.log(`[${new Date().toISOString()}] ✓ Routing to API handler for ${urlPath}`);
    
    // Health check endpoint
    if (urlPath === '/api/health' && req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }));
      return;
    }
    
    if (urlPath === '/api/user/premium-status' && req.method === 'GET') {
      console.log(`[${new Date().toISOString()}] → Premium status endpoint`);
      
      const user = await getUser(req.headers.authorization);
      if (!user) {
        console.log('No authenticated user');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          isPremium: false,
          status: 'free',
          planType: 'free',
          currency: 'USD',
          cancelAtPeriodEnd: false,
          currentPeriodEnd: null,
        }));
        return;
      }
      
      console.log(`User ID: ${user.id}`);
      
      if (!supabase) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          isPremium: false,
          status: 'free',
          planType: 'free',
          currency: 'USD',
          cancelAtPeriodEnd: false,
          currentPeriodEnd: null,
        }));
        return;
      }

      try {
        const { data, error } = await supabase
          .from('user_subscriptions')
          .select('plan_type, status, cancel_at_period_end, current_period_end')
          .eq('user_id', user.id)
          .single();

        if (error) {
          console.log('No subscription found for user:', error.message);
          // Return default free tier response
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            isPremium: false,
            status: 'inactive',
            planType: 'free',
            currency: 'USD',
            cancelAtPeriodEnd: false,
            currentPeriodEnd: null,
          }));
          return;
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          isPremium: data?.plan_type !== 'free' && data?.status === 'active',
          status: data?.status || 'inactive',
          planType: data?.plan_type || 'free',
          currency: 'USD',
          cancelAtPeriodEnd: data?.cancel_at_period_end || false,
          currentPeriodEnd: data?.current_period_end || null,
        }));
      } catch (error) {
        console.error('Error fetching premium status:', error);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          isPremium: false,
          status: 'free',
          planType: 'free',
          currency: 'USD',
          cancelAtPeriodEnd: false,
          currentPeriodEnd: null,
        }));
      }
      return;
    }
    
    if (urlPath === '/api/user/currency' && req.method === 'PATCH') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true }));
      return;
    }
    
    // Return default empty responses for unimplemented endpoints
    if (urlPath === '/api/subscriptions' && req.method === 'GET') {
      const user = await getUser(req.headers.authorization);
      if (!user || !supabase) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify([]));
        return;
      }

      try {
        const { data, error } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('user_id', user.id);

        if (error) {
          console.log('Subscriptions error:', error.message);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify([]));
          return;
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(data || []));
      } catch (error) {
        console.error('Error fetching subscriptions:', error);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify([]));
      }
      return;
    }
    
    if (urlPath === '/api/recommendations' && req.method === 'GET') {
      const user = await getUser(req.headers.authorization);
      if (!user || !supabase) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify([]));
        return;
      }

      try {
        const { data, error } = await supabase
          .from('insights')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) {
          console.log('Insights error:', error.message);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify([]));
          return;
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(data || []));
      } catch (error) {
        console.error('Error fetching recommendations:', error);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify([]));
      }
      return;
    }
    
    if (urlPath === '/api/insights' && req.method === 'GET') {
      const user = await getUser(req.headers.authorization);
      if (!user || !supabase) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify([]));
        return;
      }

      try {
        const { data, error } = await supabase
          .from('insights')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) {
          console.log('Insights error:', error.message);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify([]));
          return;
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(data || []));
      } catch (error) {
        console.error('Error fetching insights:', error);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify([]));
      }
      return;
    }
    
    if (urlPath === '/api/calendar-events' && req.method === 'GET') {
      const user = await getUser(req.headers.authorization);
      if (!user || !supabase) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify([]));
        return;
      }

      try {
        const { data, error } = await supabase
          .from('subscription_calendar_events')
          .select('*')
          .eq('user_id', user.id)
          .order('event_date', { ascending: true });

        if (error) {
          console.log('Calendar events error:', error.message);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify([]));
          return;
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(data || []));
      } catch (error) {
        console.error('Error fetching calendar events:', error);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify([]));
      }
      return;
    }
    
    if (urlPath === '/api/analysis/cost-per-use' && req.method === 'GET') {
      const user = await getUser(req.headers.authorization);
      if (!user || !supabase) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify([]));
        return;
      }

      try {
        const { data, error } = await supabase
          .from('subscriptions')
          .select('id, name, amount, usage_count')
          .eq('user_id', user.id)
          .gt('usage_count', 0);

        if (error) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify([]));
          return;
        }

        const analysis = (data || []).map(sub => ({
          id: sub.id,
          name: sub.name,
          totalCost: sub.amount,
          usageCount: sub.usage_count || 1,
          costPerUse: (sub.amount / (sub.usage_count || 1)).toFixed(2),
        }));

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(analysis));
      } catch (error) {
        console.error('Error fetching cost-per-use:', error);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify([]));
      }
      return;
    }
    
    if (urlPath.startsWith('/api/spending/category') && req.method === 'GET') {
      const user = await getUser(req.headers.authorization);
      if (!user || !supabase) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify([]));
        return;
      }

      try {
        const { data, error } = await supabase
          .from('transactions')
          .select('category, amount')
          .eq('user_id', user.id);

        if (error) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify([]));
          return;
        }

        // Group by category
        const grouped = {};
        (data || []).forEach(tx => {
          const cat = tx.category || 'Uncategorized';
          grouped[cat] = (grouped[cat] || 0) + tx.amount;
        });

        const result = Object.entries(grouped).map(([category, amount]) => ({
          category,
          amount: parseFloat(amount.toFixed(2)),
        }));

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
      } catch (error) {
        console.error('Error fetching spending by category:', error);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify([]));
      }
      return;
    }
    
    if (urlPath.startsWith('/api/spending/monthly') && req.method === 'GET') {
      const user = await getUser(req.headers.authorization);
      if (!user || !supabase) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify([]));
        return;
      }

      try {
        const { data, error } = await supabase
          .from('transactions')
          .select('date, amount')
          .eq('user_id', user.id);

        if (error) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify([]));
          return;
        }

        // Group by month
        const grouped = {};
        (data || []).forEach(tx => {
          const month = tx.date ? tx.date.substring(0, 7) : 'unknown';
          grouped[month] = (grouped[month] || 0) + tx.amount;
        });

        const result = Object.entries(grouped)
          .sort()
          .map(([month, amount]) => ({
            month,
            amount: parseFloat(amount.toFixed(2)),
          }));

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
      } catch (error) {
        console.error('Error fetching monthly spending:', error);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify([]));
      }
      return;
    }
    
    if (urlPath.startsWith('/api/metrics') && req.method === 'GET') {
      const user = await getUser(req.headers.authorization);
      if (!user || !supabase) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify([]));
        return;
      }

      try {
        // Fetch both subscriptions and transactions
        const [subResult, txResult] = await Promise.all([
          supabase.from('subscriptions').select('amount').eq('user_id', user.id),
          supabase.from('transactions').select('amount').eq('user_id', user.id),
        ]);

        const subs = subResult.data || [];
        const txs = txResult.data || [];

        const totalSpending = (subs.reduce((sum, s) => sum + (s.amount || 0), 0) +
                              txs.reduce((sum, t) => sum + (t.amount || 0), 0)).toFixed(2);

        const metrics = {
          totalSubscriptions: subs.length,
          totalTransactions: txs.length,
          totalSpending: parseFloat(totalSpending),
          averagePerSub: subs.length > 0 ? (totalSpending / subs.length).toFixed(2) : 0,
        };

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(metrics));
      } catch (error) {
        console.error('Error fetching metrics:', error);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify([]));
      }
      return;
    }
    
    if (urlPath === '/api/analytics/monthly-savings' && req.method === 'GET') {
      const user = await getUser(req.headers.authorization);
      if (!user || !supabase) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ total: 0, byMonth: [] }));
        return;
      }

      try {
        const { data, error } = await supabase
          .from('insights')
          .select('potential_savings, created_at')
          .eq('user_id', user.id);

        if (error) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ total: 0, byMonth: [] }));
          return;
        }

        let total = 0;
        const byMonth = {};
        (data || []).forEach(insight => {
          const savings = insight.potential_savings || 0;
          total += savings;
          const month = insight.created_at ? insight.created_at.substring(0, 7) : 'unknown';
          byMonth[month] = (byMonth[month] || 0) + savings;
        });

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          total: parseFloat(total.toFixed(2)),
          byMonth: Object.entries(byMonth).map(([month, amount]) => ({
            month,
            amount: parseFloat(amount.toFixed(2)),
          })),
        }));
      } catch (error) {
        console.error('Error fetching monthly savings:', error);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ total: 0, byMonth: [] }));
      }
      return;
    }
    
    if (urlPath === '/api/insights/behavioral' && req.method === 'GET') {
      const user = await getUser(req.headers.authorization);
      if (!user || !supabase) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify([]));
        return;
      }

      try {
        const { data, error } = await supabase
          .from('insights')
          .select('*')
          .eq('user_id', user.id)
          .eq('type', 'behavioral');

        if (error) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify([]));
          return;
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(data || []));
      } catch (error) {
        console.error('Error fetching behavioral insights:', error);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify([]));
      }
      return;
    }
    
    if (urlPath === '/api/family-groups' && (req.method === 'GET' || req.method === 'POST')) {
      const user = await getUser(req.headers.authorization);
      if (!user || !supabase) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify([]));
        return;
      }

      if (req.method === 'GET') {
        try {
          const { data, error } = await supabase
            .from('family_groups')
            .select('*')
            .eq('owner_id', user.id);

          if (error) {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify([]));
            return;
          }

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(data || []));
        } catch (error) {
          console.error('Error fetching family groups:', error);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify([]));
        }
      }
      return;
    }
    
    if (urlPath.startsWith('/api/family-groups') && req.method === 'GET') {
      const user = await getUser(req.headers.authorization);
      if (!user || !supabase) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify([]));
        return;
      }

      try {
        const { data, error } = await supabase
          .from('family_groups')
          .select('*')
          .or(`owner_id.eq.${user.id},members.cs.${JSON.stringify([{ user_id: user.id }])}`);

        if (error) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify([]));
          return;
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(data || []));
      } catch (error) {
        console.error('Error fetching family group:', error);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify([]));
      }
      return;
    }
    
    if (urlPath.startsWith('/api/stripe')) {
      console.log(`[${new Date().toISOString()}] → Stripe route handler: ${urlPath}`);

      if (urlPath === '/api/stripe/config' && req.method === 'GET') {
        const premium = STRIPE_PREMIUM_PRICE_ID;
        const family = STRIPE_FAMILY_PRICE_ID;
        if (!premium || !family) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Stripe price IDs are not configured on this server.' }));
          return;
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ priceIds: { premium, family } }));
        return;
      }

      if (REMOTE_API_BASE) {
        const forwarded = await proxyStripeRequest(req, res, urlPath.replace(/^\/api/, ''));
        if (forwarded) return;
      }

      // Fallback for local preview / stubbed Stripe route behavior
      if (req.method === 'POST') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ url: null }));
        return;
      }
    }
    
    // Generic proxy for any unhandled /api/* routes to Supabase
    if (urlPath.startsWith('/api/') && REMOTE_API_BASE) {
      console.log(`[${new Date().toISOString()}] → Generic proxy: ${urlPath}`);
      const forwarded = await proxyStripeRequest(req, res, urlPath.replace(/^\/api/, ''));
      if (forwarded) return;
    }
    
    // Unknown API endpoint
    console.log(`[${new Date().toISOString()}] ✗ Unknown API endpoint: ${urlPath}`);
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'API endpoint not found' }));
    return;
  }

  if (urlPath === '/api/user/currency' && req.method === 'PATCH') {
    if (!supabase) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Server not configured - SUPABASE_SERVICE_ROLE_KEY missing' }));
      return;
    }

    const user = await getUser(req.headers.authorization);
    if (!user) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Unauthorized' }));
      return;
    }

    try {
      const body = await parseBody(req);
      const { currency } = body;

      if (!currency) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Currency is required' }));
        return;
      }

      // Currency preference can be stored in frontend localStorage
      // Return success for frontend to handle locally
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, currency }));
    } catch (error) {
      console.error('Error updating currency:', error);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true }));
    }
    return;
  }

  // Static file serving
  if (urlPath === '/') urlPath = '/index.html';

  let filePath = path.join(DIST_PATH, urlPath);

  // If file doesn't exist and it's not an asset, serve index.html (SPA routing)
  if (!fs.existsSync(filePath) && !path.extname(urlPath)) {
    filePath = path.join(DIST_PATH, 'index.html');
  }

  // Security: prevent directory traversal
  if (!path.resolve(filePath).startsWith(path.resolve(DIST_PATH))) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }

    // Set proper content type
    const ext = path.extname(filePath);
    const contentTypes = {
      '.html': 'text/html',
      '.css': 'text/css',
      '.js': 'application/javascript',
      '.json': 'application/json',
      '.svg': 'image/svg+xml',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.woff': 'font/woff',
      '.woff2': 'font/woff2',
      '.ttf': 'font/ttf',
    };

    const contentType = contentTypes[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
