import "dotenv/config";
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { runRenewalChecks } from "./renewal-manager";
import { metricsRouter } from "./metrics";
import { healthRouter } from "./health";
import { logger } from './logger';
import { logRequest } from './logRequest';
import { getSupabaseClient } from './supabase';
import { validateEnvironment } from './config';
import { notFoundHandler } from './middleware/errorHandler';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { createProxyMiddleware } from 'http-proxy-middleware';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

// Dev-only: allow bypassing auth by sending `X-Dev-User: <userId>` header.
// This helps test authenticated endpoints locally without a real Supabase token.
if (process.env.NODE_ENV === 'development') {
  app.use((req, _res, next) => {
    try {
      const devUser = (req.headers['x-dev-user'] as string) || (req.headers['x-dev-user'.toLowerCase()] as string);
      if (devUser) {
        (req as any).session = (req as any).session || {};
        (req as any).session.user = { id: devUser };
      }
    } catch (err) {
      // ignore
    }
    next();
  });
}

const supabaseUrl = process.env.SUPABASE_URL;

const helmetOptions =
  process.env.NODE_ENV === 'development'
    ? {
        contentSecurityPolicy: {
          directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            styleSrc: ["'self'", "'unsafe-inline'", 'https:'],
            connectSrc: ["'self'", 'ws:', 'wss:', 'https:', ...(supabaseUrl ? [supabaseUrl] : [])],
            imgSrc: ["'self'", 'data:', 'https:'],
            fontSrc: ["'self'", 'https:', 'data:'],
            objectSrc: ["'none'"],
          },
        },
      }
    : undefined;

app.use(helmet(helmetOptions));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'development' ? 1500 : 100,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      log(logLine);
    }
  });

  next();
});

app.use(logRequest);

// Serve service worker at root
app.get('/service-worker.js', (req, res) => {
  res.type('application/javascript');
  res.sendFile(path.resolve(__dirname, '../client/public/service-worker.js'));
});

// Handle CORS preflight requests for /api
app.options('/api/*', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', 'http://127.0.0.1:5000');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.sendStatus(200);
});

// Proxy /api requests to Supabase functions
const proxyMiddleware = createProxyMiddleware({
  target: 'https://xuilgccacufwinvkocfl.supabase.co/functions/v1/api',
  changeOrigin: true,
  pathRewrite: {
    '^/api': '', // remove /api prefix when forwarding to Supabase
  },
  skip: (req: any) => {
    // Skip proxy for local routes and keep local Express handlers in charge.
    // Use originalUrl so the skip works correctly when this middleware is mounted on /api.
    const path = req.originalUrl || req.url || req.path || '';
    return path.startsWith('/api/account') ||
           path.startsWith('/api/user') ||
           path.startsWith('/api/family-groups') ||
           path.startsWith('/api/metrics') ||
           path.startsWith('/api/spending') ||
           path.startsWith('/api/subscriptions') ||
           path.startsWith('/api/analytics') ||
           path.startsWith('/api/recommendations') ||
           path.startsWith('/api/insights') ||
           path.startsWith('/api/analysis') ||
           path.startsWith('/api/calendar-events') ||
           path.startsWith('/api/track-usage-by-domain');
  },
  onProxyReq: (proxyReq: any, req: any, res: any) => {
    // Forward all headers including Authorization
    Object.keys(req.headers).forEach(key => {
      if (key !== 'host' && key !== 'origin') {
        const headerValue = req.headers[key];
        proxyReq.setHeader(key, headerValue as string | number | readonly string[]);
      }
    });
  },
} as any);

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Authorization,Content-Type');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

// Mount health check routes
app.use(healthRouter);

console.log('[Server] starting up');

async function cleanupDeletedSubscriptions() {
  try {
    const now = new Date();
    if (now.getDate() !== 1) {
      console.log('[Server] Deleted subscription cleanup only runs on the first day of the month.');
      return 0;
    }

    const supabase = getSupabaseClient();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    let deletedCount = 0;

    const { data, error }: { data: any; error: any } = await supabase
      .from('subscriptions')
      .delete()
      .eq('status', 'deleted')
      .lt('deleted_at', currentMonthStart);

    if (error) {
      if (typeof error.message === 'string' && error.message.includes('deleted_at')) {
        console.log('[Server] subscriptions.deleted_at column not present; falling back to deleting all deleted subscriptions on the first day of the month.');
        const fallback = await supabase
          .from('subscriptions')
          .delete()
          .eq('status', 'deleted');
        if (fallback.error) {
          console.error('[Server] Failed to purge deleted subscriptions in fallback cleanup:', fallback.error);
          return 0;
        }
        const fallbackData = fallback.data as any[] | null | undefined;
        deletedCount = Array.isArray(fallbackData) ? fallbackData.length : 0;
      } else {
        console.error('[Server] Failed to purge old deleted subscriptions:', error);
        return 0;
      }
    } else {
      deletedCount = Array.isArray(data) ? data.length : 0;
    }

    console.log(`[Server] Purged ${deletedCount} deleted subscription(s) on first of month cleanup.`);
    return deletedCount;
  } catch (err) {
    console.error('[Server] Error during deleted subscription cleanup:', err);
    return 0;
  }
}




(async () => {
  // Validate required runtime environment configuration before starting.
  try {
    validateEnvironment();
  } catch (err) {
    console.error('[Server] Environment validation failed:', err instanceof Error ? err.message : err);
    process.exit(1);
  }

  // Register all routes on the app instance
  await registerRoutes(httpServer, app);

  // Mount the Supabase functions proxy after local routes so that locally-defined
  // API handlers like /api/contact take precedence.
  app.use('/api', proxyMiddleware);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    // send a JSON error response
    res.status(status).json({ message });

    // log the error so it can be inspected during development
    console.error('[Express] unhandled error:', err);
    // do not rethrow - crashing on every request error was causing the dev
    // server to exit (exit code 143) and made debugging painful.
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  const distPath = path.resolve(__dirname, "../dist/public");
  const staticAvailable = fs.existsSync(distPath);
  const useStatic = process.env.NODE_ENV === "production" && staticAvailable;
  console.log(`[Server] NODE_ENV=${process.env.NODE_ENV}, staticAvailable=${staticAvailable}, useStatic=${useStatic}`);

  if (useStatic) {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    console.log(`[Server] importing setupVite from ./vite`);
    await setupVite(httpServer, app);
    console.log(`[Server] Vite middleware setup complete`);
  }

  app.use(notFoundHandler);

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || "5000", 10);
  const host = process.env.HOST || "127.0.0.1";

  httpServer.on("error", (err: NodeJS.ErrnoException) => {
    if (err.code === "EADDRINUSE") {
      console.error(
        `[Server] Port ${port} is already in use. ` +
          `Stop the process using that port or set PORT to another value before restarting.`,
      );
    } else {
      console.error("[Server] Unexpected server error:", err);
    }
    process.exit(1);
  });

  httpServer.listen(
    {
      port,
      host,
    },
    () => {
      console.log(`http://${host}:${port}`);

      // Start renewal reminder job - runs every 6 hours
      setInterval(async () => {
        console.log("[Server] Running scheduled renewal checks...");
        try {
          const result = await runRenewalChecks({ mode: "scheduled" });
          console.log("[Server] Renewal summary:", JSON.stringify(result));
        } catch (err) {
          console.error("[Server] Error in renewal check interval:", err);
        }
      }, 6 * 60 * 60 * 1000); // 6 hours

      // Run once on startup (after 30 second delay to let DB settle)
      setTimeout(async () => {
        console.log("[Server] Running initial renewal checks on startup...");
        try {
          const result = await runRenewalChecks({ mode: "scheduled" });
          console.log("[Server] Initial renewal summary:", JSON.stringify(result));
        } catch (err) {
          console.error("[Server] Error in initial renewal check:", err);
        }
      }, 30 * 1000);

      setTimeout(async () => {
        console.log("[Server] Running initial deleted subscription cleanup on startup...");
        await cleanupDeletedSubscriptions();
      }, 30 * 1000);

      setInterval(async () => {
        console.log("[Server] Running scheduled deleted subscription cleanup...");
        await cleanupDeletedSubscriptions();
      }, 24 * 60 * 60 * 1000); // daily
    },
  );
})();
