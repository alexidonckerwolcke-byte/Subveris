import { useEffect } from "react";

interface PageMetaParams {
  title?: string;
  description?: string;
  keywords?: string;
  canonical?: string;
  image?: string;
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

export function usePageMeta({ title, description, keywords, canonical, image }: PageMetaParams) {
  useEffect(() => {
    if (typeof document === "undefined") return;

    if (title) {
      document.title = title;
      setMetaTag("property", "og:type", "website");
      setMetaTag("property", "og:title", title);
      setMetaTag("name", "twitter:title", title);
      setMetaTag("name", "twitter:card", "summary_large_image");
    }

    if (description) {
      setMetaTag("name", "description", description);
      setMetaTag("property", "og:description", description);
      setMetaTag("name", "twitter:description", description);
    }

    if (keywords) {
      setMetaTag("name", "keywords", keywords);
    }

    if (canonical) {
      setCanonical(canonical);
      setMetaTag("property", "og:url", canonical);
      setMetaTag("name", "twitter:url", canonical);
    }

    if (image) {
      setMetaTag("property", "og:image", image);
      setMetaTag("property", "og:image:url", image);
      setMetaTag("property", "og:image:secure_url", image);
      setMetaTag("name", "twitter:image", image);
      setMetaTag("name", "twitter:image:src", image);
    }
  }, [title, description, keywords, canonical, image]);
}
