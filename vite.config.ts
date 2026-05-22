import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "tailwindcss";
import autoprefixer from "autoprefixer";
import path, { dirname } from "path";
import { copyFile } from "fs/promises";
import { fileURLToPath } from "url";
import type { Source, Input } from "postcss";
// import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

// __dirname replacement for ESM
const __dirname = dirname(fileURLToPath(import.meta.url));

// workspace root is the directory containing this config file
const workspaceRoot = path.resolve(__dirname);
const clientRoot = path.resolve(workspaceRoot, "client");
const srcRoot = path.resolve(clientRoot, "src");

export default defineConfig({
  logLevel: 'info',
  plugins: [
    react(),
    {
      name: "vite-github-pages-404",
      closeBundle: async () => {
        const outDir = path.resolve(workspaceRoot, "dist/public");
        const indexPath = path.join(outDir, "index.html");
        const fallbackPath = path.join(outDir, "404.html");
        await copyFile(indexPath, fallbackPath);
      },
    },
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
  envDir: workspaceRoot,
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
  css: {
    postcss: {
      plugins: [
        tailwindcss(),
        autoprefixer(),
        {
          postcssPlugin: 'vite-fix-postcss-source',
          Once(root) {
            const fallbackFile = path.resolve(workspaceRoot, 'src/unknown.css');
            if (!root.source?.input?.file) {
              root.source = { input: { file: fallbackFile } } as Source;
            }
            root.walkDecls((decl) => {
              if (!decl.source?.input?.file) {
                decl.source = { input: { file: fallbackFile } } as Source;
              }
            });
          },
        },
      ],
    },
  },
  build: {
    outDir: path.resolve(workspaceRoot, "dist/public"),
    emptyOutDir: true,
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom') || id.includes('@tanstack/react-query') || id.includes('recharts') || id.includes('date-fns') || id.includes('stripe') || id.includes('lucide-react')) {
              return 'vendor-ui';
            }
            return 'vendor';
          }
        },
      },
      onwarn(warning, warn) {
        if (typeof warning.message === 'string' && warning.message.includes('A PostCSS plugin did not pass the `from` option to `postcss.parse`.')) {
          return;
        }
        warn(warning);
      },
    },
  },
  server: {
    host: true,
    port: 5173,
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
    proxy: {
      "/api": {
        target: "http://127.0.0.1:5000",
        changeOrigin: true,
        rewrite: (path) => path,
        secure: false,
        configure: (proxy, options) => {
          proxy.on('proxyReq', (proxyReq, req, res) => {
            // Forward all headers including Authorization
            Object.keys(req.headers).forEach(key => {
              if (key !== 'host' && key !== 'origin') {
                const headerValue = req.headers[key];
                proxyReq.setHeader(key, headerValue as string | number | readonly string[]);
              }
            });
          });
        },
      },
    },
    hmr: {
      protocol: "ws",
      host: "localhost",
      port: 5173,
    },
  }
});
