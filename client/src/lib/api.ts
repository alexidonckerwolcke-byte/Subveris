import { supabase, supabaseAnonKeyOverride as supabaseAnonKey } from "./supabase";

const DEFAULT_REMOTE_API_BASE =
  'https://xuilgccacufwinvkocfl.supabase.co/functions/v1/api';
const remoteApiBase =
  import.meta.env.VITE_API_URL?.trim() ||
  (import.meta.env.VITE_SUPABASE_URL?.trim()
    ? `${import.meta.env.VITE_SUPABASE_URL.trim().replace(/\/$/, "")}/functions/v1/api`
    : DEFAULT_REMOTE_API_BASE);
// Disable local fallback to avoid 54321 errors when not running supabase functions serve
const localDevApiBase = "";
const apiBaseUrl = remoteApiBase || localDevApiBase;
const localFallbackBase = "";
const isSubverisProductionHost =
  typeof window !== "undefined" && /(^|\.)subveris\.com$/i.test(window.location.hostname);
let hasWarnedNoApiUrl = false;

async function resolveAuthToken(forceRefresh = false) {
  const tokenStr = localStorage.getItem("supabase.auth.token");
  if (!forceRefresh && tokenStr) {
    try {
      const tokenObj = JSON.parse(tokenStr);
      if (tokenObj?.access_token) return tokenObj.access_token;
      if (typeof tokenObj === "string") return tokenObj;
    } catch {
      return tokenStr;
    }
  }

  if (supabase) {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();
    if (!error && session?.access_token) {
      localStorage.setItem(
        "supabase.auth.token",
        JSON.stringify({
          access_token: session.access_token,
          refresh_token: session.refresh_token,
        })
      );
      return session.access_token;
    }
  }

  return null;
}

function normalizeBase(base: string) {
  return base.replace(/\/$/, "");
}

function shouldUseSameOriginApi(path: string) {
  return Boolean(path.startsWith("/api") && !import.meta.env.DEV && isSubverisProductionHost);
}

export function resolveApiUrl(path: string) {
  if (/^https?:\/\//.test(path)) {
    return path;
  }

  if (path.startsWith("/api")) {
    if (import.meta.env.DEV || shouldUseSameOriginApi(path)) {
      if (!hasWarnedNoApiUrl) {
        console.info(
          import.meta.env.DEV
            ? "Development mode: forcing local /api proxy for all /api requests."
            : "Production mode: using same-origin /api requests on subveris.com to avoid cross-origin CORS failures."
        );
        hasWarnedNoApiUrl = true;
      }
      return path;
    }
    return resolveRemoteApiUrl(path);
  }

  if (!apiBaseUrl) {
    return path;
  }

  const normalizedBase = normalizeBase(apiBaseUrl);
  if (normalizedBase.endsWith("/api") && path.startsWith("/api")) {
    return normalizedBase + path.slice(4);
  }
  return normalizedBase + path;
}

export function resolveRemoteApiUrl(path: string) {
  if (/^https?:\/\//.test(path)) {
    return path;
  }

  if (!remoteApiBase) {
    return path;
  }

  const normalizedBase = normalizeBase(remoteApiBase);
  if (normalizedBase.endsWith("/api") && path.startsWith("/api")) {
    return normalizedBase + path.slice(4);
  }
  return normalizedBase + path;
}

function shouldUseRemoteFallback(url: string) {
  return Boolean(remoteApiBase && url.startsWith("/api"));
}

export async function fetchWithRemoteFallback(url: string, init: RequestInit) {
  const primaryUrl = url;
  const secondaryUrl = shouldUseRemoteFallback(url) ? resolveRemoteApiUrl(url) : null;

  const attemptFetch = async (fetchUrl: string) => {
    try {
      return await fetch(fetchUrl, init);
    } catch (error) {
      if (secondaryUrl && fetchUrl === primaryUrl) {
        console.warn("[apiFetch] primary /api request failed, retrying against remote API", { primaryUrl, secondaryUrl, error });
        return await fetch(secondaryUrl, init);
      }
      throw error;
    }
  };

  const res = await attemptFetch(primaryUrl);
  const shouldRetry = secondaryUrl && [401, 403, 404, 500, 502, 503, 504].includes(res.status);
  if (shouldRetry) {
    console.warn("[apiFetch] primary /api request returned retryable status, retrying against remote API", {
      primaryUrl,
      secondaryUrl,
      status: res.status,
    });
    return await fetch(secondaryUrl, init);
  }

  return res;
}

export function resolveLocalApiUrl(path: string) {
  if (!localFallbackBase) {
    return resolveApiUrl(path);
  }
  const normalizedBase = normalizeBase(localFallbackBase);
  if (normalizedBase.endsWith("/api") && path.startsWith("/api")) {
    return normalizedBase + path.slice(4);
  }
  return normalizedBase + path;
}

export async function apiFetch(input: string, init?: RequestInit) {
  let token = await resolveAuthToken();
  if (!token) {
    token = await resolveAuthToken(true);
  }
  const effectiveToken = token || supabaseAnonKey;
  const primaryUrl = resolveApiUrl(input);
  if (import.meta.env.DEV) {
    console.debug("[apiFetch] resolved URL", {
      input,
      primaryUrl,
      hasToken: Boolean(token),
      usingAnonKey: Boolean(!token && effectiveToken),
    });
  }
  const buildRequest = (authToken: string | null): RequestInit => ({
    mode: "cors",
    credentials: "omit",
    cache: "no-store",
    ...init,
    headers: {
      ...(init?.headers as Record<string, string> | undefined),
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    },
  });

  let res = await fetchWithRemoteFallback(primaryUrl, buildRequest(effectiveToken));
  if (res.ok) {
    return res;
  }

  if (res.status === 401) {
    const refreshedToken = await resolveAuthToken(true);
    const retryToken = refreshedToken || supabaseAnonKey;
    if (retryToken && retryToken !== effectiveToken) {
      const retryRes = await fetchWithRemoteFallback(primaryUrl, buildRequest(retryToken));
      if (retryRes.ok) {
        return retryRes;
      }
      return retryRes;
    }
  }

  if (import.meta.env.DEV && localFallbackBase && primaryUrl.startsWith(normalizeBase(apiBaseUrl))) {
    const fallbackUrl = resolveLocalApiUrl(input);
    console.warn(`[apiFetch] Primary API failed with ${res.status}. Trying local fallback: ${fallbackUrl}`);
    return fetchWithRemoteFallback(fallbackUrl, buildRequest(token));
  }
  return res;
}
