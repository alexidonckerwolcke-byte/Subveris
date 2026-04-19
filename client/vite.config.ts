import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path, { dirname } from "path";
import { fileURLToPath } from "url";
// import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

// __dirname equivalent for ES modules
const __dirname = dirname(fileURLToPath(import.meta.url));

// directory of this config (the client project)
const clientRoot = path.resolve(__dirname);
// workspace root is parent of client
const workspaceRoot = path.resolve(clientRoot, "..");
const srcRoot = path.resolve(clientRoot, "src");

// diagnostics for debugging alias resolution
console.log("workspaceRoot", workspaceRoot);
console.log("clientRoot", clientRoot);
console.log("srcRoot", srcRoot);


export default defineConfig({
  logLevel: 'error',
  // minimal plugin set to reduce complexity
  plugins: [
    react(),
  ],
  resolve: {
    alias: {
      // project shortcut: '@' points at client/src
      "@": srcRoot,
    },
  },
  build: {
    outDir: path.resolve(workspaceRoot, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    host: true,
    allowedHosts: [
      "5173-i1972mewu5sdpdlv7msqp-aeb8a8cf.us1.manus.computer",
      "localhost",
      "0.0.0.0"
    ],
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      Pragma: "no-cache",
      Expires: "0",
      "Surrogate-Control": "no-store",
    },
    proxy: {
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true,
      },
      "/auth": {
        target: "http://localhost:5000",
        changeOrigin: true,
        bypass: (req) => {
          if (req.url?.startsWith('/auth/callback')) {
            return req.url;
          }
        },
      },
    },
  }
});
