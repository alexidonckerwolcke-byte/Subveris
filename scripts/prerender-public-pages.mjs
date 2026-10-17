import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";
import { JSDOM } from "jsdom";

const root = process.cwd();
const outputDir = path.join(root, "dist/public");
const baseHtml = fs.readFileSync(path.join(outputDir, "index.html"), "utf8");
const sitemap = new JSDOM(fs.readFileSync(path.join(outputDir, "sitemap.xml"), "utf8"), {
  contentType: "application/xml",
});
const sitemapUrls = [...sitemap.window.document.getElementsByTagName("loc")]
  .map((node) => node.textContent?.trim())
  .filter(Boolean);
const publicPaths = sitemapUrls.map((url) => {
  const parsed = new URL(url);
  if (parsed.origin !== "https://subveris.com" || parsed.search || parsed.hash) {
    throw new Error(`Unexpected sitemap URL: ${url}`);
  }
  return parsed.pathname;
});

const rendererPath = path.join(outputDir, ".seo-prerender-renderer.mjs");

await build({
  entryPoints: [path.join(root, "scripts/prerender-public-pages.tsx")],
  bundle: true,
  packages: "external",
  platform: "node",
  format: "esm",
  jsx: "automatic",
  outfile: rendererPath,
  alias: {
    "@": path.join(root, "client/src"),
    "@shared": path.join(root, "shared"),
    "@assets": path.join(root, "attached_assets"),
  },
  define: {
    "import.meta.env": JSON.stringify({
      DEV: false,
      PROD: true,
      MODE: "production",
      VITE_SUPABASE_URL: "",
      VITE_SUPABASE_ANON_KEY: "",
      VITE_API_URL: "",
      VITE_STRIPE_PREMIUM_PRICE_ID: "",
      VITE_STRIPE_FAMILY_PRICE_ID: "",
    }),
  },
  plugins: [{
    name: "ignore-css-during-prerender",
    setup(esbuild) {
      esbuild.onLoad({ filter: /\.css$/ }, () => ({ contents: "", loader: "js" }));
    },
  }],
});

try {
  const renderer = await import(`${pathToFileURL(rendererPath).href}?build=${Date.now()}`);
  const registeredPaths = new Set(renderer.getPublicPagePaths());
  for (const route of publicPaths) {
    if (!registeredPaths.has(route)) {
      throw new Error(`Sitemap route is missing from the prerender renderer: ${route}`);
    }
  }
  if (registeredPaths.size !== publicPaths.length) {
    throw new Error("Prerender route list and sitemap do not match exactly");
  }

  const fallbackMetadata = {
    "/docs": {
      title: "Subveris Documentation | Subscription Tracking and Optimization",
      description: "Learn how Subveris tracks subscriptions, records usage, analyzes cost per use, and helps you manage renewals.",
    },
    "/contact": {
      title: "Contact Subveris | Subscription Management Support",
      description: "Contact the Subveris team for help with subscription tracking, usage insights, or your account.",
    },
    "/privacy": {
      title: "Subveris Privacy Policy | Data and Account Privacy",
      description: "Read how Subveris handles account, subscription, and usage data and the controls available to users.",
    },
    "/terms": {
      title: "Subveris Terms of Service",
      description: "Review the terms governing use of the Subveris subscription management service.",
    },
    "/security": {
      title: "Subveris Security | Account and Data Protection",
      description: "Learn about security measures used to protect Subveris accounts and subscription data.",
    },
  };

  function setMeta(document, attribute, key, content) {
    if (!content) return;
    let element = document.head.querySelector(`meta[${attribute}="${key}"]`);
    if (!element) {
      element = document.createElement("meta");
      element.setAttribute(attribute, key);
      document.head.appendChild(element);
    }
    element.setAttribute("content", content);
  }

  function updateHead(document, route, metadata, indexable) {
    const fallback = fallbackMetadata[route] || {};
    const title = metadata?.title || fallback.title || "Subveris | Subscription Tracking and Usage Insights";
    const description = metadata?.description || fallback.description || "Track recurring subscriptions, understand usage and cost per use, and manage renewals with Subveris.";
    const canonical = `https://subveris.com${route === "/" ? "/" : route}`;
    const image = metadata?.image || "https://subveris.com/assets/logo.png?v=3";
    const type = metadata?.type === "article" || metadata?.type === "guide" ? "article" : "website";

    document.title = title;
    setMeta(document, "name", "description", description);
    setMeta(document, "name", "robots", indexable ? "index,follow,max-snippet:-1,max-image-preview:large,max-video-preview:-1" : "noindex,nofollow");
    setMeta(document, "name", "googlebot", indexable ? "index,follow" : "noindex,nofollow");
    setMeta(document, "name", "bingbot", indexable ? "index,follow" : "noindex,nofollow");
    setMeta(document, "property", "og:type", type);
    setMeta(document, "property", "og:site_name", "Subveris");
    setMeta(document, "property", "og:title", title);
    setMeta(document, "property", "og:description", description);
    setMeta(document, "property", "og:url", canonical);
    setMeta(document, "property", "og:image", image);
    setMeta(document, "name", "twitter:card", "summary_large_image");
    setMeta(document, "name", "twitter:title", title);
    setMeta(document, "name", "twitter:description", description);
    setMeta(document, "name", "twitter:url", canonical);
    setMeta(document, "name", "twitter:image", image);

    document.head.querySelectorAll('link[rel="canonical"]').forEach((link) => link.remove());
    if (indexable) {
      const canonicalLink = document.createElement("link");
      canonicalLink.rel = "canonical";
      canonicalLink.href = canonical;
      document.head.appendChild(canonicalLink);
    }

    if (metadata?.author) setMeta(document, "name", "author", metadata.author);
    if (metadata?.publishedTime) setMeta(document, "property", "article:published_time", metadata.publishedTime);
    if (metadata?.modifiedTime) setMeta(document, "property", "article:modified_time", metadata.modifiedTime);
  }

  function createHtml(route, metadata, markup, indexable) {
    const dom = new JSDOM(baseHtml);
    const { document } = dom.window;
    updateHead(document, route, metadata, indexable);
    const snapshot = document.getElementById("seo-prerender");
    if (!snapshot) throw new Error("Base HTML is missing #seo-prerender");
    snapshot.innerHTML = markup;
    const html = dom.serialize();
    dom.window.close();
    return html;
  }

  for (const route of publicPaths) {
    const { markup, pageMeta } = renderer.renderPublicPage(route);
    const html = createHtml(route, pageMeta, markup, true);
    const relativePath = route === "/" ? "index.html" : path.join(route.slice(1), "index.html");
    const outputPath = path.join(outputDir, relativePath);
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, html);
    console.log(`Prerendered ${route} (${markup.length} HTML characters)`);
  }

  const appShell = createHtml("/app", null, "", false);
  fs.writeFileSync(path.join(outputDir, "app-shell.html"), appShell);

  const notFound = renderer.renderNotFound("/not-found");
  const notFoundHtml = createHtml("/not-found", {
    title: "Page Not Found | Subveris",
    description: "The requested Subveris page could not be found.",
  }, notFound.markup, false);
  fs.writeFileSync(path.join(outputDir, "404.html"), notFoundHtml);
} finally {
  fs.rmSync(rendererPath, { force: true });
}