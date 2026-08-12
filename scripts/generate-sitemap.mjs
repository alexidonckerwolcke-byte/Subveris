import fs from "fs";
import path from "path";

const pagesDir = path.resolve("client/src/pages");
const sitemapPath = path.resolve("client/public/sitemap.xml");

const commonUrls = [
  "/",
  "/pricing",
  "/docs",
  "/privacy",
  "/terms",
  "/security",
  "/contact",
];

const pageFiles = fs.readdirSync(pagesDir).filter((file) => file.startsWith("cancel-") && file.endsWith(".tsx"));
const urls = [...commonUrls, ...pageFiles.map((file) => `/${path.basename(file, ".tsx")}`)].sort((a, b) => a.localeCompare(b));

const lines = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
];

for (const url of urls) {
  let priority = "0.6";
  if (url === "/") priority = "1.0";
  else if (url === "/pricing" || url === "/docs") priority = "0.8";
  else if (url.startsWith("/cancel-")) priority = "0.7";

  lines.push("  <url>");
  lines.push(`    <loc>https://www.subveris.com${url}</loc>`);
  lines.push(`    <lastmod>${new Date().toISOString().split("T")[0]}</lastmod>`);
  lines.push("    <changefreq>monthly</changefreq>");
  lines.push(`    <priority>${priority}</priority>`);
  lines.push("  </url>");
}

lines.push("</urlset>");

fs.writeFileSync(sitemapPath, lines.join("\n") + "\n");
console.log(`Generated sitemap with ${urls.length} URLs at ${sitemapPath}`);
