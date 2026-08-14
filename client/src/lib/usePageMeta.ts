import { useEffect } from "react";

interface PageMetaParams {
  title?: string;
  description?: string;
  keywords?: string;
  canonical?: string;
  image?: string;
  author?: string;
  type?: "website" | "article" | "guide";
  publishedTime?: string;
  modifiedTime?: string;
}

function setMetaTag(attribute: "name" | "property", key: string, value: string) {
  if (typeof document === "undefined") return;

  let element = document.head.querySelector(`meta[${attribute}='${key}']`) as HTMLMetaElement | null;
  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }
  element.setAttribute("content", value);
}

function setCanonical(href: string) {
  if (typeof document === "undefined") return;

  let link = document.head.querySelector("link[rel='canonical']") as HTMLLinkElement | null;
  if (!link) {
    link = document.createElement("link");
    link.setAttribute("rel", "canonical");
    document.head.appendChild(link);
  }
  link.setAttribute("href", href);
}

export function usePageMeta({ 
  title, 
  description, 
  keywords, 
  canonical, 
  image,
  author,
  type = "website",
  publishedTime,
  modifiedTime,
}: PageMetaParams) {
  useEffect(() => {
    if (typeof document === "undefined") return;

    // Basic metadata
    if (title) {
      document.title = title;
      setMetaTag("property", "og:title", title);
      setMetaTag("name", "twitter:title", title);
    }

    if (description) {
      setMetaTag("name", "description", description);
      setMetaTag("property", "og:description", description);
      setMetaTag("name", "twitter:description", description);
    }

    if (keywords) {
      setMetaTag("name", "keywords", keywords);
    }

    // Open Graph tags
    setMetaTag("property", "og:type", type === "article" || type === "guide" ? "article" : type);
    if (canonical) {
      setCanonical(canonical);
      setMetaTag("property", "og:url", canonical);
      setMetaTag("name", "twitter:url", canonical);
    }

    if (image) {
      setMetaTag("property", "og:image", image);
      setMetaTag("property", "og:image:url", image);
      setMetaTag("property", "og:image:secure_url", image);
      setMetaTag("property", "og:image:type", "image/png");
      setMetaTag("property", "og:image:width", "1200");
      setMetaTag("property", "og:image:height", "630");
      setMetaTag("name", "twitter:image", image);
      setMetaTag("name", "twitter:image:src", image);
    }

    // Twitter Card tags
    setMetaTag("name", "twitter:card", "summary_large_image");
    setMetaTag("name", "twitter:site", "@subveris");
    setMetaTag("name", "twitter:creator", "@subveris");
    if (author) {
      setMetaTag("name", "author", author);
    }

    // Article metadata (for guides)
    if (type === "article" || type === "guide") {
      setMetaTag("property", "article:author", author || "Subveris");
      if (publishedTime) {
        setMetaTag("property", "article:published_time", publishedTime);
      }
      if (modifiedTime) {
        setMetaTag("property", "article:modified_time", modifiedTime);
      }
      setMetaTag("property", "article:section", "Finance & Subscriptions");
      setMetaTag("property", "article:tag", "subscriptions");
      setMetaTag("property", "article:tag", "cancellation");
      setMetaTag("property", "article:tag", "finance");
    }

    // Additional SEO tags
    setMetaTag("name", "robots", "index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1");
    setMetaTag("name", "googlebot", "index, follow");
    setMetaTag("name", "bingbot", "index, follow");
    setMetaTag("property", "og:site_name", "Subveris");
    setMetaTag("name", "format-detection", "telephone=no");
    setMetaTag("name", "apple-mobile-web-app-capable", "yes");
    setMetaTag("name", "apple-mobile-web-app-status-bar-style", "default");
    
  }, [title, description, keywords, canonical, image, author, type, publishedTime, modifiedTime]);
}
