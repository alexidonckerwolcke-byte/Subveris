import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || '0.0.0.0';
const STATIC_DIR = process.env.STATIC_DIR || 'dist/public';
let DIST_PATH = path.join(__dirname, STATIC_DIR);
if (!fs.existsSync(DIST_PATH)) {
  const fallbackPath = path.join(__dirname, 'public');
  if (fs.existsSync(fallbackPath)) {
    DIST_PATH = fallbackPath;
  }
}

console.log('[Startup] Static assets path:', DIST_PATH);

function pruneLocalLogs() {
  try {
    const logPath = path.join(__dirname, 'ab-events.log');
    if (fs.existsSync(logPath)) {
      const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
      const retainedLines = fs.readFileSync(logPath, 'utf8')
        .split('\n')
        .filter((line) => {
          if (!line.trim()) return false;
          try {
            const timestamp = JSON.parse(line).ts;
            return !timestamp || Date.parse(timestamp) >= cutoff;
          } catch {
            return false;
          }
        });
      fs.writeFileSync(logPath, retainedLines.length ? `${retainedLines.join('\n')}\n` : '');
    }
  } catch (error) {
    console.warn('[Logs] Failed to prune local logs:', error.message);
  }
}

pruneLocalLogs();

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

// Simple in-memory rate limiter (IP-based)
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 100; // per IP per minute

const checkRateLimit = (ip) => {
  const key = ip || 'unknown';
  const now = Date.now();
  const data = rateLimitMap.get(key) || { count: 0, resetAt: now + RATE_LIMIT_WINDOW };
  
  if (now > data.resetAt) {
    data.count = 0;
    data.resetAt = now + RATE_LIMIT_WINDOW;
  }
  
  data.count++;
  rateLimitMap.set(key, data);
  
  if (data.count > RATE_LIMIT_MAX_REQUESTS) {
    return false;
  }
  return true;
};

// Validate subscription input fields
const validateSubscriptionData = (data) => {
  const errors = [];
  if (data.name && (typeof data.name !== 'string' || data.name.length > 255)) {
    errors.push('Invalid name');
  }
  if (data.amount !== undefined && (typeof data.amount !== 'number' || data.amount < 0 || data.amount > 99999)) {
    errors.push('Invalid amount');
  }
  if (data.currency && (typeof data.currency !== 'string' || data.currency.length !== 3)) {
    errors.push('Invalid currency');
  }
  if (data.frequency && !['monthly', 'yearly', 'weekly', 'quarterly'].includes(data.frequency)) {
    errors.push('Invalid frequency');
  }
  if (data.category && (typeof data.category !== 'string' || data.category.length > 50)) {
    errors.push('Invalid category');
  }
  return errors;
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

const RUNTIME_CONFIG = {
  VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '',
  VITE_SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '',
  VITE_API_URL: process.env.VITE_API_URL || process.env.SUPABASE_API_URL || process.env.SUPABASE_FUNCTIONS_URL || '',
};

function injectRuntimeConfig(html) {
  const configScript = `<script>window.__SUPABASE_CONFIG__ = ${JSON.stringify(RUNTIME_CONFIG)};</script>`;
  return html.replace(/<\/head>/i, `${configScript}</head>`);
}

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
  
  // Keep request logs free of query strings, which may contain sensitive values.
  console.log(`[${new Date().toISOString()}] [${req.method}] ${urlPath}`);

  // Apply rate limiting
  const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
  if (!checkRateLimit(clientIp)) {
    console.warn(`[Rate Limit] Blocking IP: ${clientIp}`);
    res.writeHead(429, { 'Content-Type': 'application/json', 'Retry-After': '60' });
    res.end(JSON.stringify({ error: 'Too many requests' }));
    return;
  }

  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  
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

        let currency = 'USD';
        try {
          const { data: userRow } = await supabase
            .from('users')
            .select('currency')
            .eq('id', user.id)
            .single();

          const rawCurrency = String(userRow?.currency || user.user_metadata?.currency || 'USD').toUpperCase();
          if (/^[A-Z]{3}$/.test(rawCurrency)) {
            currency = rawCurrency;
          }
        } catch (currencyError) {
          console.warn('Failed to load saved currency preference:', currencyError);
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          isPremium: data?.plan_type !== 'free' && data?.status === 'active',
          status: data?.status || 'inactive',
          planType: data?.plan_type || 'free',
          currency,
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
        const currency = String(body.currency || '').toUpperCase();

        if (!currency || !/^[A-Z]{3}$/.test(currency)) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid currency code' }));
          return;
        }

        try {
          await supabase.auth.admin.updateUserById(user.id, {
            user_metadata: { currency },
          });
        } catch (authError) {
          console.warn('[Currency] Auth update error:', authError);
        }

        try {
          await supabase.from('users').upsert({ id: user.id, currency });
        } catch (dbError) {
          console.warn('[Currency] Failed to upsert currency into users table:', dbError);
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, currency }));
      } catch (error) {
        console.error('Error updating currency:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Failed to update currency' }));
      }
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

    if (urlPath === '/api/extension/detected-subscriptions' && req.method === 'POST') {
      if (!supabase) {
        res.writeHead(503, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Backend not configured for extension sync' }));
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
        const items = Array.isArray(body.subscriptions) ? body.subscriptions : [];
        const saved = [];

        for (const item of items) {
          const isApprovedForSync = item?.approvedForSync === true || item?.source === 'gmail-metadata-approved' || item?.requiresReview === false;
          if (!isApprovedForSync) {
            console.log('[Extension Sync] skipping unapproved detected subscription:', item?.serviceName || item?.name || 'unknown');
            continue;
          }

          const serviceName = String(item.serviceName || item.name || item.service_name || item.provider || item.title || '').trim();
          const domainRaw = item.domain || item.website_domain || item.website || item.websiteDomain || item.domainName || '';
          const normalizedDomain = String(domainRaw || '').replace(/^https?:\/\//i, '').replace(/^www\./i, '').replace(/\/$/, '').toLowerCase();
          const name = serviceName || normalizedDomain || 'Unknown subscription';
          const amountValue = Number(item.amount ?? item.detectedPrice ?? item.price ?? 0);
          const currencyCode = String(item.currency || 'USD').toUpperCase();
          const normalizedCurrency = /^[A-Z]{3}$/.test(currencyCode) ? currencyCode : 'USD';
          const frequency = String(item.frequency || item.detectedBillingCycle || item.billingCycle || 'monthly').toLowerCase();
          const status = String(item.status || 'active').toLowerCase();
          const nextBillingAt = item.detectedRenewalDate || item.next_billing_at || item.nextBillingDate || item.renewal_date || null;

          if (!serviceName && !normalizedDomain) continue;

          const record = {
            user_id: user.id,
            name,
            amount: Number.isFinite(amountValue) ? amountValue : 0,
            currency: normalizedCurrency,
            frequency,
            status,
            description: item.planName || item.plan_label || null,
            website_domain: normalizedDomain || null,
            is_detected: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            next_billing_at: nextBillingAt,
          };

          const { data: existingRows, error: lookupError } = await supabase
            .from('subscriptions')
            .select('id')
            .eq('user_id', user.id)
            .or(`name.ilike.${name},website_domain.ilike.${normalizedDomain || ''}`)
            .limit(1);

          if (lookupError) {
            console.warn('[Extension Sync] lookup failed:', lookupError.message);
          }

          let resolved = null;
          if (existingRows && existingRows.length > 0) {
            const { data, error } = await supabase
              .from('subscriptions')
              .update(record)
              .eq('id', existingRows[0].id)
              .select();
            if (error) {
              console.warn('[Extension Sync] update failed:', error.message);
            } else {
              resolved = data?.[0] || null;
            }
          } else {
            const { data, error } = await supabase
              .from('subscriptions')
              .insert({
                ...record,
                status: String(item.status || item.detectedStatus || 'detected_pending_verification').toLowerCase() || 'detected_pending_verification',
              })
              .select();
            if (error) {
              console.warn('[Extension Sync] insert failed:', error.message);
            } else {
              resolved = data?.[0] || null;
            }
          }

          if (resolved) saved.push(resolved);
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, saved: saved.length, subscriptions: saved }));
      } catch (error) {
        console.error('Error syncing detected subscriptions:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Failed to sync detected subscriptions' }));
      }
      return;
    }

    if (urlPath === '/api/subscriptions/bulk-import' && req.method === 'POST') {
      if (!supabase) {
        res.writeHead(503, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Backend not configured' }));
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
        const items = Array.isArray(body.subscriptions) ? body.subscriptions : [];
        const saved = [];
        const errors = [];

        for (let idx = 0; idx < items.length; idx++) {
          const item = items[idx];
          
          // Validate required fields
          const name = String(item.name || '').trim();
          const amount = parseFloat(item.amount || '0');
          const frequency = String(item.frequency || 'monthly').toLowerCase();
          const category = String(item.category || 'other').toLowerCase();

          if (!name) {
            errors.push({ index: idx, reason: 'Name is required' });
            continue;
          }

          if (!amount || amount <= 0) {
            errors.push({ index: idx, reason: 'Valid amount is required' });
            continue;
          }

          // Parse next billing date
          let nextBillingDate = null;
          if (item.nextBillingDate) {
            const parsed = new Date(item.nextBillingDate);
            if (!Number.isNaN(parsed.getTime())) {
              nextBillingDate = parsed.toISOString();
            }
          }

          const record = {
            user_id: user.id,
            name,
            amount,
            currency: 'USD',
            frequency,
            category,
            status: 'active',
            website_domain: item.websiteDomain || null,
            is_detected: false,
            usage_count: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            next_billing_at: nextBillingDate,
          };

          try {
            const { data, error } = await supabase
              .from('subscriptions')
              .insert(record)
              .select();

            if (error) {
              errors.push({ index: idx, name, reason: error.message });
            } else if (data && data.length > 0) {
              saved.push(data[0]);
            }
          } catch (err) {
            errors.push({ index: idx, name, reason: err instanceof Error ? err.message : 'Unknown error' });
          }
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          success: saved.length > 0, 
          imported: saved.length, 
          total: items.length,
          errors: errors.length > 0 ? errors : undefined,
          subscriptions: saved 
        }));
      } catch (error) {
        console.error('Error bulk importing subscriptions:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Failed to bulk import subscriptions' }));
      }
      return;
    }

    if (urlPath === '/api/subscriptions/scan-email' && req.method === 'POST') {
      if (!supabase) {
        res.writeHead(503, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Backend not configured' }));
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
        const emailText = String(body.emailText || body.content || '');
        const emailSubject = String(body.emailSubject || body.subject || '');

        if (!emailText && !emailSubject) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Email content required' }));
          return;
        }

        // Common subscription keywords and patterns
        const subscriptionKeywords = [
          'subscription', 'renewal', 'renewal notice', 'billing', 'invoice',
          'charge', 'payment', 'order confirmation', 'purchase', 'receipt',
          'renewing', 'your membership', 'your account', 'continues', 'auto-renew'
        ];

        const servicePatterns = {
          'Netflix': ['netflix', 'subscription charge'],
          'Spotify': ['spotify', 'premium membership'],
          'Amazon Prime': ['amazon prime', 'prime membership'],
          'Disney+': ['disney', 'disneyplus', 'disney\\+'],
          'YouTube': ['youtube premium'],
          'HBO Max': ['hbo', 'hbomax'],
          'Hulu': ['hulu'],
          'Apple Music': ['apple music', 'itunes'],
          'Microsoft 365': ['microsoft 365', 'office 365'],
          'Adobe': ['adobe', 'creative cloud'],
          'Dropbox': ['dropbox'],
          'OneDrive': ['onedrive'],
          'iCloud': ['icloud'],
          'LinkedIn': ['linkedin premium'],
          'Linkedin Premium': ['linkedin premium', 'linkedin plus'],
          'Tinder': ['tinder', 'gold', 'plus'],
          'Uber': ['uber', 'pass'],
          'DoorDash': ['doordash'],
          'Audible': ['audible', 'audiobook'],
          'Coursera': ['coursera', 'plus'],
          'MasterClass': ['masterclass'],
          'Duolingo': ['duolingo', 'plus'],
          'HelloFresh': ['hellofresh', 'meal plan'],
          'Blue Apron': ['blue apron'],
          'NordVPN': ['nordvpn'],
          'ExpressVPN': ['expressvpn'],
          'Grammarly': ['grammarly'],
          'LastPass': ['lastpass'],
          'Slack': ['slack'],
          'Zoom': ['zoom'],
          'Asana': ['asana'],
          'Notion': ['notion'],
          'Canva': ['canva', 'pro'],
          'Figma': ['figma'],
          'Discord': ['discord', 'nitro'],
          'Twitch': ['twitch', 'prime'],
          'PlayStation': ['playstation plus', 'ps plus'],
          'Xbox': ['xbox game pass', 'xbox live'],
          'Nintendo': ['nintendo switch online'],
          'Calm': ['calm'],
          'Headspace': ['headspace'],
          'Peloton': ['peloton'],
          'Fitbit': ['fitbit'],
          'ClassPass': ['classpass'],
          'Scribd': ['scribd'],
          'Kindle': ['kindle unlimited']
        };

        // Check if email is subscription-related
        const fullText = (emailText + ' ' + emailSubject).toLowerCase();
        const isSubscriptionRelated = subscriptionKeywords.some(kw => fullText.includes(kw.toLowerCase()));

        if (!isSubscriptionRelated) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ 
            detected: false, 
            message: 'Email does not appear to be subscription-related' 
          }));
          return;
        }

        // Extract service names
        const detectedServices = [];
        for (const [serviceName, patterns] of Object.entries(servicePatterns)) {
          for (const pattern of patterns) {
            const regex = new RegExp(pattern, 'gi');
            if (regex.test(fullText)) {
              if (!detectedServices.find(s => s.name === serviceName)) {
                detectedServices.push({ name: serviceName });
              }
              break;
            }
          }
        }

        // Extract amounts (look for $ or other currency symbols)
        const amountMatch = emailText.match(/[\$£€¥][\s]?(\d+(?:[.,]\d{2})?)/g);
        const amounts = amountMatch ? amountMatch.map(amt => parseFloat(amt.replace(/[^\d.]/g, ''))) : [];

        // Extract renewal date (common patterns)
        const datePatterns = [
          /(?:renew|expires?|next billing|billing date)[:\s]+(\d{1,2}\/\d{1,2}\/\d{2,4})/gi,
          /(\d{1,2}\/\d{1,2}\/\d{2,4})/g,
          /(?:january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2}),?\s+(\d{4})/gi
        ];

        let nextBillingDate = null;
        for (const pattern of datePatterns) {
          const match = emailText.match(pattern);
          if (match) {
            try {
              nextBillingDate = new Date(match[0]).toISOString().split('T')[0];
              if (nextBillingDate) break;
            } catch (e) {
              // Continue to next pattern
            }
          }
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          detected: detectedServices.length > 0,
          services: detectedServices,
          amounts: amounts.slice(0, 3), // Top 3 amounts found
          estimatedRenewalDate: nextBillingDate,
          message: `Found ${detectedServices.length} potential subscription(s)`
        }));
      } catch (error) {
        console.error('Error scanning email:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Failed to scan email' }));
      }
      return;
    }

    if (urlPath === '/api/subscriptions/analyze-transactions' && req.method === 'POST') {
      // Analyzes financial transactions to detect recurring subscription charges
      // This endpoint can be used with Plaid data or manual transaction uploads
      if (!supabase) {
        res.writeHead(503, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Backend not configured' }));
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
        const transactions = Array.isArray(body.transactions) ? body.transactions : [];

        if (transactions.length === 0) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Transactions array required' }));
          return;
        }

        // Analyze transactions for recurring patterns
        const recurringMap = {};

        transactions.forEach((txn) => {
          const merchant = String(txn.merchant || txn.name || '').toLowerCase().trim();
          const amount = Math.abs(parseFloat(txn.amount || 0));
          const date = new Date(txn.date || 0);

          if (!merchant || amount <= 0) return;

          if (!recurringMap[merchant]) {
            recurringMap[merchant] = {
              merchant,
              transactions: [],
              totalAmount: 0,
              count: 0
            };
          }

          recurringMap[merchant].transactions.push({ amount, date });
          recurringMap[merchant].totalAmount += amount;
          recurringMap[merchant].count++;
        });

        // Detect recurring charges (transactions with same amount on similar intervals)
        const detected = [];

        for (const [merchant, data] of Object.entries(recurringMap)) {
          if (data.count < 2) continue; // Need at least 2 transactions

          // Sort by date
          const sorted = data.transactions.sort((a, b) => a.date - b.date);

          // Check if amounts are consistent (within 5% variance)
          const amounts = sorted.map(t => t.amount);
          const avgAmount = amounts.reduce((a, b) => a + b) / amounts.length;
          const variance = Math.max(...amounts) - Math.min(...amounts);
          const isConsistentAmount = variance / avgAmount <= 0.05;

          // Check if intervals are consistent (monthly, yearly, etc)
          if (isConsistentAmount && sorted.length >= 2) {
            const intervals = [];
            for (let i = 1; i < sorted.length; i++) {
              intervals.push(Math.round((sorted[i].date - sorted[i-1].date) / (1000 * 60 * 60 * 24)));
            }

            const avgInterval = intervals.reduce((a, b) => a + b) / intervals.length;
            const intervalVariance = Math.max(...intervals) - Math.min(...intervals);

            // If interval variance is small (consistent payments)
            if (intervalVariance <= 5 || avgInterval <= 1) {
              detected.push({
                merchant: merchant.charAt(0).toUpperCase() + merchant.slice(1),
                averageAmount: parseFloat(avgAmount.toFixed(2)),
                estimatedFrequency: avgInterval <= 7 ? 'weekly' : avgInterval <= 35 ? 'monthly' : 'yearly',
                transactionCount: data.count,
                lastTransaction: sorted[sorted.length - 1].date,
                confidence: isConsistentAmount ? 'high' : 'medium'
              });
            }
          }
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          detected: detected,
          totalAnalyzed: transactions.length,
          foundRecurring: detected.length
        }));
      } catch (error) {
        console.error('Error analyzing transactions:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Failed to analyze transactions' }));
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

    // A/B experiment event logging endpoint
    if (urlPath === '/api/ab-event' && req.method === 'POST') {
      try {
        const body = await parseBody(req);
        const key = String(body.key || 'unknown');
        const variantIndex = Number(body.variantIndex);
        const eventType = String(body.eventType || 'impression');
        const label = body.label || null;
        const ts = new Date().toISOString();

        // Append to local log file for lightweight analytics
        try {
          const logPath = path.join(__dirname, 'ab-events.log');
          pruneLocalLogs();
          const entry = { ts, key, variantIndex: Number.isFinite(variantIndex) ? variantIndex : null, eventType, label };
          fs.appendFileSync(logPath, JSON.stringify(entry) + '\n');
        } catch (fileErr) {
          console.warn('[AB] Failed to append ab-events.log:', fileErr && fileErr.message);
        }

        // If Supabase is configured, persist to a table `ab_experiments` (optional)
        if (supabase) {
          try {
            await supabase.from('ab_experiments').insert({
              experiment_key: key,
              variant_index: Number.isFinite(variantIndex) ? variantIndex : null,
              event_type: eventType,
              label: label,
              created_at: ts,
            });
          } catch (dbErr) {
            console.warn('[AB] Supabase insert failed:', dbErr && dbErr.message);
          }
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
      } catch (error) {
        console.error('[AB] Failed to handle /api/ab-event:', error && error.message);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'failed' }));
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
          const { data: ownerGroups, error: ownerError } = await supabase
            .from('family_groups')
            .select('*')
            .eq('owner_id', user.id);

          const { data: memberRows, error: memberError } = await supabase
            .from('family_group_members')
            .select('family_group_id, role, family_groups(id, name, created_at, owner_id)')
            .eq('user_id', user.id);

          if (ownerError || memberError) {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify([]));
            return;
          }

          const merged = new Map();
          for (const group of ownerGroups || []) {
            merged.set(group.id, { ...group, role: 'owner' });
          }
          for (const row of memberRows || []) {
            const nestedGroup = Array.isArray(row?.family_groups) ? row.family_groups[0] : row?.family_groups;
            const group = nestedGroup || { id: row?.family_group_id, name: 'Family group', owner_id: null, created_at: row?.joined_at };
            if (!group?.id) continue;
            const existing = merged.get(group.id) || {};
            merged.set(group.id, { ...existing, ...group, role: existing.role || row?.role || 'member' });
          }

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify([...merged.values()].map((group) => ({
            id: group.id,
            name: group.name,
            createdAt: group.created_at,
            ownerId: group.owner_id,
            role: group.role,
          }))));
        } catch (error) {
          console.error('Error fetching family groups:', error);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify([]));
        }
      } else if (req.method === 'POST') {
        try {
          const body = await parseBody(req);
          const { name } = body;
          
          if (!name) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Missing required field: name' }));
            return;
          }

          const { data, error } = await supabase
            .from('family_groups')
            .insert({ owner_id: user.id, name })
            .select()
            .single();

          if (error) {
            console.error('Error creating family group:', error);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Failed to create family group' }));
            return;
          }

          res.writeHead(201, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(data));
        } catch (error) {
          console.error('Error handling POST /api/family-groups:', error);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Internal server error' }));
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

  // Gmail OAuth endpoints
  if (urlPath === '/api/auth/gmail-oauth-url' && req.method === 'POST') {
    const user = await getUser(req.headers.authorization);
    if (!user) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Unauthorized' }));
      return;
    }

    const { data: userPlan } = await supabase.from('user_subscriptions').select('plan_type, status').eq('user_id', user.id).maybeSingle();
    if (!userPlan || !['premium', 'family'].includes(String(userPlan.plan_type || '').toLowerCase()) || !['active', 'trialing'].includes(String(userPlan.status || '').toLowerCase())) {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Gmail scanning requires an active Premium or Family plan' }));
      return;
    }

    const googleClientId = process.env.GOOGLE_OAUTH_CLIENT_ID || '';
    const googleClientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET || '';
    const redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI || 'urn:ietf:wg:oauth:2.0:oob';

    if (!googleClientId) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Gmail OAuth not configured' }));
      return;
    }

    const scope = 'https://www.googleapis.com/auth/gmail.metadata';
    const oauthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${googleClientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scope)}&access_type=offline&prompt=${encodeURIComponent('select_account consent')}`;

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ oauthUrl }));
    return;
  }

  if (urlPath === '/api/auth/gmail-token' && req.method === 'POST') {
    const user = await getUser(req.headers.authorization);
    if (!user) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Unauthorized' }));
      return;
    }

    const { data: userPlan } = await supabase.from('user_subscriptions').select('plan_type, status').eq('user_id', user.id).maybeSingle();
    if (!userPlan || !['premium', 'family'].includes(String(userPlan.plan_type || '').toLowerCase()) || !['active', 'trialing'].includes(String(userPlan.status || '').toLowerCase())) {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Gmail scanning requires an active Premium or Family plan' }));
      return;
    }

    const body = await parseBody(req);
    const { code } = body;

    if (!code) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Missing authorization code' }));
      return;
    }

    const googleClientId = process.env.GOOGLE_OAUTH_CLIENT_ID || '';
    const googleClientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET || '';
    const redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI || 'urn:ietf:wg:oauth:2.0:oob';

    if (!googleClientId || !googleClientSecret) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Gmail OAuth not configured' }));
      return;
    }

    try {
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: googleClientId,
          client_secret: googleClientSecret,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code'
        })
      });

      const tokenData = await tokenResponse.json();

      if (!tokenData.access_token) {
        throw new Error('No access token received');
      }

      // Store in Supabase for future use
      if (supabase) {
        await supabase
          .from('user_oauth_tokens')
          .upsert({
            user_id: user.id,
            provider: 'gmail',
            access_token: tokenData.access_token,
            refresh_token: tokenData.refresh_token || null,
            expires_at: tokenData.expires_in ? new Date(Date.now() + tokenData.expires_in * 1000) : null,
            updated_at: new Date()
          }, { onConflict: 'user_id,provider' });
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        access_token: tokenData.access_token,
        expires_in: tokenData.expires_in || 3600
      }));
    } catch (error) {
      console.error('[Server] Gmail token exchange error:', error);
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Token exchange failed' }));
    }
    return;
  }

  // Check Gmail authorization status
  if (urlPath === '/api/auth/gmail-status' && req.method === 'GET') {
    const user = await getUser(req.headers.authorization);
    if (!user) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Unauthorized' }));
      return;
    }

    try {
      if (supabase) {
        const { data, error } = await supabase
          .from('user_oauth_tokens')
          .select('access_token')
          .eq('user_id', user.id)
          .eq('provider', 'gmail')
          .single();

        const connected = !error && data?.access_token;
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ connected }));
      } else {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ connected: false }));
      }
    } catch (error) {
      console.error('[Server] Gmail status check error:', error);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ connected: false }));
    }
    return;
  }

  // Disconnect Gmail
  if (urlPath === '/api/auth/gmail-disconnect' && req.method === 'POST') {
    const user = await getUser(req.headers.authorization);
    if (!user) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Unauthorized' }));
      return;
    }

    try {
      if (supabase) {
        await supabase
          .from('user_oauth_tokens')
          .delete()
          .eq('user_id', user.id)
          .eq('provider', 'gmail');
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true }));
    } catch (error) {
      console.error('[Server] Gmail disconnect error:', error);
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Disconnect failed' }));
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
      '.ico': 'image/x-icon',
      '.jpg': 'image/jpeg',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.woff': 'font/woff',
      '.woff2': 'font/woff2',
      '.ttf': 'font/ttf',
    };

    const contentType = contentTypes[ext] || 'application/octet-stream';
    const isHtmlResponse = ext === '.html' || urlPath === '/' || urlPath.endsWith('/index.html');
    const isVersionedAsset =
      urlPath.includes('favicon') ||
      urlPath.includes('apple-touch-icon') ||
      urlPath.includes('site.webmanifest') ||
      urlPath.includes('/assets/logo.png') ||
      urlPath.includes('/service-worker.js');

    const cacheControl = isHtmlResponse || isVersionedAsset
      ? 'no-cache, must-revalidate'
      : 'public, max-age=31536000, immutable';

    let responseBody = data;
    if (isHtmlResponse && filePath.endsWith(path.join(DIST_PATH, 'index.html'))) {
      const html = data.toString('utf-8');
      responseBody = Buffer.from(injectRuntimeConfig(html));
    }

    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': cacheControl,
    });
    res.end(responseBody);
  });
});

server.listen(PORT, HOST, () => {
  console.log(`Server running on http://${HOST}:${PORT}`);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
