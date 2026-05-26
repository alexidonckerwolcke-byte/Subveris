import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path, { dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const clientRoot = path.resolve(__dirname);
const workspaceRoot = path.resolve(clientRoot, "..");
const srcRoot = path.resolve(clientRoot, "src");

export default defineConfig({
  base: '/Subveris-1/',
  envDir: workspaceRoot,
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
        target: "http://127.0.0.1:5000",
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path,
        configure: (proxy, options) => {
          proxy.on("proxyReq", (proxyReq, req, res) => {
            Object.keys(req.headers).forEach((key) => {
              if (key !== "host" && key !== "origin") {
                const headerValue = req.headers[key];
                proxyReq.setHeader(key, headerValue as string | number | readonly string[]);
              }
            });
          });
        },
      },
    },
  }
});
