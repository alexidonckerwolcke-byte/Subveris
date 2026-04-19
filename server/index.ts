import "dotenv/config";
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { runRenewalChecks } from "./renewal-manager";
import { metricsRouter } from "./metrics";
import { healthRouter } from "./health";
import { logger } from './logger';
import { logRequest } from './logRequest';
import { getSupabaseClient } from './supabase';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';

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

app.use(helmet());
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

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Authorization,Content-Type');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

logger.info('Server starting up');

async function cleanupDeletedSubscriptions() {
  try {
    const supabase = getSupabaseClient();
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const { data, error }: { data: any; error: any } = await supabase
      .from('subscriptions')
      .delete()
      .eq('status', 'deleted')
      .lt('deleted_at', currentMonthStart);

    if (error) {
      if (typeof error.message === 'string' && error.message.includes('deleted_at')) {
        console.log('[Server] Skipping deleted subscription cleanup: subscriptions.deleted_at column not present');
        return 0;
      }
      console.error('[Server] Failed to purge old deleted subscriptions:', error);
      return 0;
    }

    const deletedCount = Array.isArray(data) ? data.length : 0;
    console.log(`[Server] Purged ${deletedCount} deleted subscription(s) older than ${currentMonthStart}`);
    return deletedCount;
  } catch (err) {
    console.error('[Server] Error during deleted subscription cleanup:', err);
    return 0;
  }
}




(async () => {
  // Register all routes on the app instance
  await registerRoutes(httpServer, app);

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
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

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
      log(`serving on ${host}:${port}`);

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
