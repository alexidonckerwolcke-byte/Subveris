import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path, { dirname } from "path";
import { fileURLToPath } from "url";
// import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

// __dirname replacement for ESM
const __dirname = dirname(fileURLToPath(import.meta.url));

// workspace root is the directory containing this config file
const workspaceRoot = path.resolve(__dirname);
const clientRoot = path.resolve(workspaceRoot, "client");
const srcRoot = path.resolve(clientRoot, "src");

// diagnostics for debugging alias resolution
console.log("workspaceRoot", workspaceRoot);
console.log("clientRoot", clientRoot);
console.log("srcRoot", srcRoot);


export default defineConfig({
  logLevel: 'error',
  plugins: [
    react(),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer(),
          ),
          await import("@replit/vite-plugin-dev-banner").then((m) =>
            m.devBanner(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      // pin React to workspace-installed versions (important when running from client subfolder)
      react: path.resolve(workspaceRoot, "node_modules", "react"),
      "react-dom": path.resolve(workspaceRoot, "node_modules", "react-dom"),
      "react-dom/client": path.resolve(workspaceRoot, "node_modules", "react-dom", "client"),
      // project shortcut: '@' points at client/src
      "@": srcRoot,
      "@shared": path.resolve(workspaceRoot, "shared"),
      "@assets": path.resolve(workspaceRoot, "attached_assets"),
    },
  },
  root: clientRoot,
  build: {
    outDir: path.resolve(workspaceRoot, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
    hmr: {
      host: "localhost",
      port: 5173,
    },
    proxy: {
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true,
      },
      "/auth": {
        target: "http://localhost:5000",
        changeOrigin: true,
      },
    },
  }
});
