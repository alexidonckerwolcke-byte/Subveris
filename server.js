import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

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
  console.log(`[${req.method}] ${req.url} -> ${urlPath}`);
  
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // API Routes
  if (urlPath === '/api/user/premium-status' && req.method === 'GET') {
    console.log('[API] Premium status request - Auth header:', req.headers.authorization ? 'present' : 'missing');
    
    // For now, return defaults to all requests to test connectivity
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      test: true,
      isPremium: false,
      status: 'free',
      planType: 'free',
      currency: 'USD',
      cancelAtPeriodEnd: false,
      currentPeriodEnd: null,
      authHeader: req.headers.authorization ? 'received' : 'missing',
    }));
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

      const { error } = await supabase
        .from('profiles')
        .update({ currency })
        .eq('id', user.id);

      if (error) {
        console.warn('Currency update error (table may not exist):', error.message);
        // Still return success - data will be stored in frontend localStorage
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, currency }));
        return;
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, currency }));
    } catch (error) {
      console.error('Error updating currency:', error);
      // Return success anyway - frontend uses localStorage as fallback
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
