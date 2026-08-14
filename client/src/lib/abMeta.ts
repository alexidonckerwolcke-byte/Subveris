type Meta = {
  title?: string;
  description?: string;
  keywords?: string;
  canonical?: string;
  image?: string;
  author?: string;
  type?: "website" | "article" | "guide";
  publishedTime?: string;
  modifiedTime?: string;
};

const variants: Record<string, Meta[]> = {
  "cancel-netflix": [
    {
      title: "How to cancel Netflix — stop charges & keep access | Subveris",
      description:
        "Step-by-step guide to cancel Netflix, avoid unexpected renewals, and stop recurring charges — keep access until your billing period ends.",
    },
    {
      title: "Cancel Netflix fast — avoid extra charges | Subveris",
      description:
        "Cancel Netflix in minutes and prevent surprise renewals. Clear steps to stop billing while keeping access through your current cycle.",
    },
    {
      title: "Netflix cancellation guide — stop auto‑renewals today | Subveris",
      description:
        "Follow this simple Netflix cancellation guide to stop auto‑renewals and recurring charges. Confirm cancellation and keep watching until your end date.",
    },
  ],

  "cancel-spotify": [
    {
      title: "Cancel Spotify Premium — stop charges, keep your playlists | Subveris",
      description:
        "Learn how to cancel Spotify Premium and prevent recurring charges. Follow simple web, iOS, and Android steps — keep playlists until your billing cycle ends.",
    },
    {
      title: "How to cancel Spotify Premium (web & mobile) | Subveris",
      description:
        "Quick steps to cancel Spotify Premium on desktop, iOS, and Android — avoid further charges and keep your saved music until the billing date.",
    },
    {
      title: "Stop Spotify charges — cancel Premium now | Subveris",
      description: "Cancel Spotify Premium quickly and avoid the next payment. Clear, tested instructions for every platform.",
    },
  ],

  "cancel-amazon-prime": [
    {
      title: "Cancel Amazon Prime membership — stop auto‑renewals & refunds | Subveris",
      description:
        "Clear, fast steps to cancel Amazon Prime, stop auto‑renewals, and check refund eligibility — includes guidance for provider‑billed accounts.",
    },
    {
      title: "How to cancel Amazon Prime and stop renewals | Subveris",
      description: "Step‑by‑step guide to end your Amazon Prime membership, prevent future charges, and verify refund options.",
    },
    {
      title: "Amazon Prime cancellation — avoid future charges | Subveris",
      description: "Quickly cancel Prime, confirm your expiration date, and learn about refunds and bundled billing.",
    },
  ],

  "cancel-hbo-max": [
    {
      title: "Cancel HBO Max — how to stop charges (provider tips) | Subveris",
      description:
        "How to cancel HBO Max and stop recurring charges, including steps for accounts billed through TV/internet providers, plus desktop and mobile instructions.",
    },
    {
      title: "How to cancel HBO Max (including provider‑billed accounts) | Subveris",
      description:
        "Cancel HBO Max and avoid hidden provider charges — desktop, iOS, and Android instructions plus provider‑billing guidance.",
    },
    {
      title: "Stop HBO Max charges — cancellation guide | Subveris",
      description: "Simple HBO Max cancellation steps to prevent the next billing cycle and handle third‑party billing.",
    },
  ],

  "cancel-disney-plus": [
    {
      title: "Cancel Disney Plus — quick guide to stop renewals | Subveris",
      description:
        "Step‑by‑step Disney Plus cancellation instructions to stop recurring charges and confirm your expiration date — includes bundle/provider notes.",
    },
    {
      title: "How to cancel Disney Plus and avoid auto‑renewals | Subveris",
      description: "Fast, clear steps to cancel Disney Plus, check for bundled billing, and confirm your account's end date.",
    },
    {
      title: "Disney Plus cancellation — stop charges today | Subveris",
      description: "Cancel Disney Plus quickly and prevent the next payment — includes desktop and mobile instructions and bundle troubleshooting.",
    },
  ],
};

export function pickMetaVariant(key: string, base: Meta): Meta {
  if (typeof window === "undefined") return base;
  const list = variants[key];
  if (!list || list.length === 0) return base;

  const storageKey = `abmeta:${key}`;
  try {
    const saved = window.localStorage.getItem(storageKey);
    if (saved !== null) {
      const idx = Number(saved);
      if (!Number.isNaN(idx) && list[idx]) return { ...base, ...list[idx] };
    }
  } catch (e) {
    // ignore localStorage errors
  }

  const idx = Math.floor(Math.random() * list.length);
  try {
    window.localStorage.setItem(storageKey, String(idx));
  } catch (e) {
    // ignore
  }

  // Report impression to server (fire-and-forget). Avoid duplicate reports by tracking a reported flag.
  try {
    const reportedKey = `abmeta:reported:${key}`;
    const alreadyReported = window.localStorage.getItem(reportedKey);
    if (!alreadyReported) {
      const payload = { key, variantIndex: idx, eventType: 'impression' };
      try {
        if (typeof navigator !== 'undefined' && 'sendBeacon' in navigator) {
          const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
          navigator.sendBeacon('/api/ab-event', blob);
        } else {
          fetch('/api/ab-event', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            keepalive: true,
          }).catch(() => {});
        }
        window.localStorage.setItem(reportedKey, '1');
      } catch (e) {
        // ignore reporting failures
      }
    }
  } catch (e) {
    // ignore localStorage/report errors
  }

  return { ...base, ...list[idx] };
}

export default variants;

// Utility to report a conversion event for a given experiment key.
export function reportAbConversion(key: string, label?: string) {
  if (typeof window === 'undefined') return;
  try {
    const storageKey = `abmeta:${key}`;
    const saved = window.localStorage.getItem(storageKey);
    if (saved === null) return; // no variant selected
    const idx = Number(saved);
    const payload = { key, variantIndex: idx, eventType: 'conversion', label: label || null };

    try {
      if (typeof navigator !== 'undefined' && 'sendBeacon' in navigator) {
        const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
        navigator.sendBeacon('/api/ab-event', blob);
      } else {
        fetch('/api/ab-event', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          keepalive: true,
        }).catch(() => {});
      }
    } catch (e) {
      // ignore
    }
  } catch (e) {
    // ignore
  }
}
