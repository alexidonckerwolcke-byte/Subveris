import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = process.env.PORT || 3000;
const STATIC_DIR = process.env.STATIC_DIR || 'dist/public';
let DIST_PATH = path.join(__dirname, STATIC_DIR);
if (!fs.existsSync(DIST_PATH)) {
  const fallbackPath = path.join(__dirname, 'public');
  if (fs.existsSync(fallbackPath)) {
    DIST_PATH = fallbackPath;
  }
}

console.log('[Startup] Static assets path:', DIST_PATH);

// Initialize Supabase
const supabaseUrl = process.env.SUPABASE_URL || 'https://xuilgccacufwinvkocfl.supabase.co';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY;

let supabase = null;
if (supabaseServiceRoleKey) {
  supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
  console.log('✓ Supabase initialized with service role key');
} else {
  console.warn('⚠ SUPABASE_SERVICE_ROLE_KEY or SERVICE_ROLE_KEY not set - API endpoints will not work');
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

// Helper to extract and verify JWT token
const getUser = async (authHeader) => {
  if (!supabase) return null;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7);
  try {
    const { data, error } = await supabase.auth.getUser(token);
    if (error) return null;
    return data?.user || null;
  } catch (err) {
    return null;
  }
};

const REMOTE_API_BASE = process.env.VITE_API_URL || process.env.SUPABASE_API_URL || process.env.SUPABASE_FUNCTIONS_URL || 'https://xuilgccacufwinvkocfl.supabase.co/functions/v1/api';
const STRIPE_PREMIUM_PRICE_ID = process.env.STRIPE_PREMIUM_PRICE_ID || process.env.VITE_STRIPE_PREMIUM_PRICE_ID || '';
const STRIPE_FAMILY_PRICE_ID = process.env.STRIPE_FAMILY_PRICE_ID || process.env.VITE_STRIPE_FAMILY_PRICE_ID || '';

console.log('[Startup] Stripe Price IDs loaded:', {
  premium: STRIPE_PREMIUM_PRICE_ID ? '✓ set' : '✗ NOT SET',
  family: STRIPE_FAMILY_PRICE_ID ? '✓ set' : '✗ NOT SET',
  premium_value: STRIPE_PREMIUM_PRICE_ID || 'undefined',
  family_value: STRIPE_FAMILY_PRICE_ID || 'undefined'
});

console.log('[Startup] Remote API Base:', {
  url: REMOTE_API_BASE,
  isSet: REMOTE_API_BASE ? '✓' : '✗'
});

async function proxyStripeRequest(req, res, pathSuffix) {
  if (!REMOTE_API_BASE) {
    return false;
  }

  const cleanedSuffix = pathSuffix.replace(/^\//, '');
  const remoteUrl = `${REMOTE_API_BASE.replace(/\/$/, '')}/${cleanedSuffix}`;
  const headers = {};
  for (const [key, value] of Object.entries(req.headers)) {
    if (!value) continue;
    if (key === 'host') continue;
    // Remove accept-encoding to avoid compression issues
    if (key.toLowerCase() === 'accept-encoding') continue;
    if (key.toLowerCase() === 'content-encoding') continue;
    headers[key] = value;
  }

  console.log(`[Proxy] Forwarding to ${remoteUrl} with auth: ${headers.authorization ? '✓ set' : '✗ missing'}`);

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
    console.error('Remote URL was:', remoteUrl);
    res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Failed to proxy request', details: error.message }));
    return true;
  }
}

async function proxyApiRequest(req, res) {
  if (!REMOTE_API_BASE) {
    return false;
  }
  return proxyStripeRequest(req, res, req.url.replace(/^\/api/, ''));
}

// Currency conversion rates
const EXCHANGE_RATES = {
  USD: 1, EUR: 0.92, GBP: 0.79, CAD: 1.35, AUD: 1.52,
  JPY: 152.0, CHF: 0.88, SEK: 10.85, NOK: 10.75, DKK: 6.95,
  PLN: 4.05, CZK: 23.5, HUF: 365.0, BRL: 5.25, MXN: 18.5,
  ARS: 950.0, TRY: 34.0, ZAR: 18.5, INR: 84.0, CNY: 7.25,
  KRW: 1350.0, SGD: 1.35, HKD: 7.8, NZD: 1.65,
};

function getExchangeRate(currency) {
  return EXCHANGE_RATES[(currency || 'USD').trim().toUpperCase()] ?? 1;
}

function convertToUSD(amount, currency) {
  return amount / getExchangeRate(currency);
}

function calculateMonthlyCost(amount, frequency) {
  const normalizedFrequency = (frequency || 'monthly').toLowerCase();
  if (normalizedFrequency === 'yearly') return amount / 12;
  if (normalizedFrequency === 'quarterly') return amount / 3;
  if (normalizedFrequency === 'weekly') return amount * 4;
  return amount;
}

function parseDateString(dateInput) {
  if (!dateInput) return null;
  const parsed = new Date(dateInput);
  return Number.isFinite(parsed.getTime()) ? parsed : null;
}

function getSubscriptionRenewalDateString(sub) {
  return (
    sub.next_billing_at ||
    sub.next_billing_date ||
    sub.nextBillingDate ||
    sub.renewal_date ||
    sub.renewalDate ||
    null
  );
}

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
      
      if (!supabase && REMOTE_API_BASE) {
        const forwarded = await proxyApiRequest(req, res);
        if (forwarded) return;
      }

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
      if (!supabase && REMOTE_API_BASE) {
        const forwarded = await proxyApiRequest(req, res);
        if (forwarded) return;
      }

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
      if (!supabase && REMOTE_API_BASE) {
        const forwarded = await proxyApiRequest(req, res);
        if (forwarded) return;
      }

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
      if (!supabase && REMOTE_API_BASE) {
        const forwarded = await proxyApiRequest(req, res);
        if (forwarded) return;
      }

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
      if (!supabase && REMOTE_API_BASE) {
        const forwarded = await proxyApiRequest(req, res);
        if (forwarded) return;
      }

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
      if (!supabase && REMOTE_API_BASE) {
        const forwarded = await proxyApiRequest(req, res);
        if (forwarded) return;
      }

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
      if (REMOTE_API_BASE) {
        console.log(`[${new Date().toISOString()}] → Proxying spending category request to remote functions: ${req.url}`);
        const forwarded = await proxyStripeRequest(req, res, req.url.replace(/^\/api/, ''));
        if (forwarded) return;
      }

      const user = await getUser(req.headers.authorization);
      if (!user || !supabase) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify([]));
        return;
      }

      try {
        const now = new Date();
        const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        
        // Fetch subscriptions
        const { data, error } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('user_id', user.id)
          .in('status', ['active', 'unused', 'to-cancel']);

        if (error) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify([]));
          return;
        }

        // Filter to subscriptions with renewal date <= today in current month
        const grouped = {};
        (data || []).forEach(sub => {
          // Skip deleted/invalid
          if (sub.status === 'deleted' || sub.deleted_at) return;
          const renewalDateStr = getSubscriptionRenewalDateString(sub);
          if (!renewalDateStr) return;
          
          const renewalDate = parseDateString(renewalDateStr);
          if (!renewalDate) return;
          renewalDate.setHours(0, 0, 0, 0);
          
          // For current month: only include if renewal_date <= today
          if (renewalDate >= currentMonthStart && renewalDate <= today) {
            // Calculate monthly cost (convert frequency to monthly amount)
            const frequency = (sub.frequency || 'monthly').toLowerCase();
            const amount = Number(sub.amount) || 0;
            const monthlyCost = calculateMonthlyCost(amount, frequency);
            
            // Convert to USD
            const convertedCost = convertToUSD(monthlyCost, sub.currency);
            
            const cat = sub.category || 'Uncategorized';
            grouped[cat] = (grouped[cat] || 0) + convertedCost;
          }
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
      if (REMOTE_API_BASE) {
        console.log(`[${new Date().toISOString()}] → Proxying spending monthly request to remote functions: ${req.url}`);
        const forwarded = await proxyStripeRequest(req, res, req.url.replace(/^\/api/, ''));
        if (forwarded) return;
      }

      const user = await getUser(req.headers.authorization);
      if (!user || !supabase) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify([]));
        return;
      }

      try {
        // Fetch all subscriptions
        const { data: subscriptions, error } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('user_id', user.id);

        if (error || !subscriptions) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify([]));
          return;
        }

        // Generate monthly spending for LAST 6 COMPLETE MONTHS + CURRENT MONTH (7 total)
        const monthlyData = [];
        const now = new Date();
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        
        for (let i = 6; i >= 0; i--) {
          const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
          const monthStr = `${monthNames[monthStart.getMonth()]} ${monthStart.getFullYear()}`;
          const isCurrentMonth = i === 0;
          
          let monthlyAmount = 0;
          
          for (const sub of subscriptions) {
            // Skip deleted/invalid subscriptions
            if (sub.status === 'deleted' || sub.deleted_at) continue;
            if (!['active', 'unused', 'to-cancel'].includes(sub.status)) continue;
            const renewalDateStr = getSubscriptionRenewalDateString(sub);
            if (!renewalDateStr) continue;
            
            const renewalDate = parseDateString(renewalDateStr);
            if (!renewalDate) continue;
            renewalDate.setHours(0, 0, 0, 0);
            
            // For current month: only include if renewal_date <= today
            let includeInMonthlySpend = false;
            if (isCurrentMonth) {
              const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
              if (renewalDate <= today) includeInMonthlySpend = true;
            } else {
              // For past months: include if renewal date is in that month
              if (renewalDate >= monthStart && renewalDate <= monthEnd) {
                includeInMonthlySpend = true;
              }
            }
            
            if (includeInMonthlySpend) {
              // Calculate monthly cost (convert frequency to monthly amount)
              const frequency = (sub.frequency || 'monthly').toLowerCase();
              const amount = Number(sub.amount) || 0;
              const monthlyCost = calculateMonthlyCost(amount, frequency);
              
              // Convert to USD
              const convertedCost = convertToUSD(monthlyCost, sub.currency);
              monthlyAmount += convertedCost;
            }
          }
          
          monthlyData.push({
            month: monthStr,
            amount: Math.round(monthlyAmount * 100) / 100,
          });
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(monthlyData));
      } catch (error) {
        console.error('Error fetching monthly spending:', error);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify([]));
      }
      return;
    }
    
    if (urlPath.startsWith('/api/metrics') && req.method === 'GET') {
      if (!supabase && REMOTE_API_BASE) {
        const forwarded = await proxyApiRequest(req, res);
        if (forwarded) return;
      }

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
      if (!supabase && REMOTE_API_BASE) {
        const forwarded = await proxyApiRequest(req, res);
        if (forwarded) return;
      }

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
      if (!supabase && REMOTE_API_BASE) {
        const forwarded = await proxyApiRequest(req, res);
        if (forwarded) return;
      }

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
      if (!supabase && REMOTE_API_BASE) {
        const forwarded = await proxyApiRequest(req, res);
        if (forwarded) return;
      }

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
      if (!supabase && REMOTE_API_BASE) {
        const forwarded = await proxyApiRequest(req, res);
        if (forwarded) return;
      }

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
        const forwarded = await proxyStripeRequest(req, res, req.url.replace(/^\/api/, ''));
        if (forwarded) return;
      }

      // Fallback for local preview / stubbed Stripe route behavior
      if (req.method === 'POST') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ url: null }));
        return;
      }
    }
    
    // Extension download
    if (urlPath === '/api/extension/download' && req.method === 'GET') {
      const fs = require('fs');
      const path = require('path');
      const archiver = require('archiver');
      
      try {
        const extensionDir = path.join(process.cwd(), 'extension');
        
        // Check if extension directory exists
        if (!fs.existsSync(extensionDir)) {
          console.log(`[${new Date().toISOString()}] ✗ Extension directory not found: ${extensionDir}`);
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Extension not found' }));
          return;
        }

        // Create ZIP archive
        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', 'attachment; filename="subveris-extension.zip"');
        
        const archive = archiver('zip', { zlib: { level: 9 } });
        
        archive.on('error', (err) => {
          console.error(`[${new Date().toISOString()}] ✗ Archive error:`, err);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Failed to create archive' }));
        });
        
        archive.pipe(res);
        archive.directory(extensionDir, 'subveris-extension');
        archive.finalize();
        
        console.log(`[${new Date().toISOString()}] ✓ Extension downloaded`);
      } catch (error) {
        console.error(`[${new Date().toISOString()}] ✗ Extension download error:`, error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Failed to download extension' }));
      }
      return;
    }
    
    // Generic proxy for any unhandled /api/* routes to Supabase
    if (urlPath.startsWith('/api/') && REMOTE_API_BASE) {
      console.log(`[${new Date().toISOString()}] → Generic proxy: ${req.url}`);
      const forwarded = await proxyStripeRequest(req, res, req.url.replace(/^\/api/, ''));
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
