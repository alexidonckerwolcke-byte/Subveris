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
    fs: {
      strict: true,
      deny: ["**/.*"],
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
