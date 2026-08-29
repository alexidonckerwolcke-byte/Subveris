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
let hasWarnedNoApiUrl = false;

function getOrCreateSessionToken() {
  const sessionKey = "subveris.session.id";
  const csrfKey = "subveris.csrf.token";

  let sessionId = sessionStorage.getItem(sessionKey);
  let csrfToken = sessionStorage.getItem(csrfKey);

  if (!sessionId || !csrfToken) {
    sessionId = crypto.randomUUID();
    csrfToken = crypto.randomUUID();
    sessionStorage.setItem(sessionKey, sessionId);
    sessionStorage.setItem(csrfKey, csrfToken);
  }

  return { sessionId, csrfToken };
}

async function ensureCsrfSession(authToken: string | null) {
  const existing = getOrCreateSessionToken();
  try {
    const response = await fetch(resolveApiUrl("/api/security/session"), {
      method: "GET",
      credentials: "same-origin",
      cache: "no-store",
      headers: {
        Accept: "application/json",
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      },
    });

    if (response.ok) {
      const data = await response.json();
      if (data?.sessionId && data?.csrfToken) {
        sessionStorage.setItem("subveris.session.id", data.sessionId);
        sessionStorage.setItem("subveris.csrf.token", data.csrfToken);
        return { sessionId: data.sessionId, csrfToken: data.csrfToken };
      }
    }
  } catch {
    // Fall back to the locally generated values if the server cannot issue one.
  }

  return existing;
}

export function clearStoredAuthState() {
  localStorage.removeItem("supabase.auth.token");
  sessionStorage.removeItem("subveris.session.id");
  sessionStorage.removeItem("subveris.csrf.token");
}

export async function resolveAuthToken(forceRefresh = false) {
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

function withTimeout(ms: number, promise: Promise<Response>): Promise<Response> {
  const timeoutPromise = new Promise<Response>((_, reject) => {
    const id = window.setTimeout(() => reject(new Error(`Request timed out after ${ms}ms`)), ms);
    promise.then(
      () => window.clearTimeout(id),
      () => window.clearTimeout(id),
    );
  });
  return Promise.race([promise, timeoutPromise]);
}

async function fetchWithRetry(url: string, init: RequestInit, retries = 2): Promise<Response> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await withTimeout(8000, fetch(url, init));
    } catch (error) {
      lastError = error;

      const message = error instanceof Error ? error.message : String(error);
      const isConnectionClosed = message.includes('Failed to fetch') || message.includes('ERR_CONNECTION_CLOSED') || message.includes('NetworkError') || message.includes('load interrupted');

      if (isConnectionClosed && attempt === retries) {
        return new Response(JSON.stringify({ error: 'Request failed because the connection was closed or the network was unavailable' }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      if (attempt === retries) {
        throw error;
      }
      await new Promise((resolve) => window.setTimeout(resolve, 250 * (attempt + 1)));
    }
  }

  throw lastError;
}

export function resolveApiUrl(path: string) {
  if (/^https?:\/\//.test(path)) {
    return path;
  }

  if (path.startsWith("/api")) {
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
      return await fetchWithRetry(fetchUrl, init);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const isConnectionClosed = message.includes('Failed to fetch') || message.includes('ERR_CONNECTION_CLOSED') || message.includes('NetworkError') || message.includes('load interrupted');

      if (isConnectionClosed && secondaryUrl && fetchUrl === primaryUrl) {
        console.warn("[apiFetch] connection closed while calling primary API; falling back to remote API", { primaryUrl, secondaryUrl, error });
        try {
          return await fetchWithRetry(secondaryUrl, init);
        } catch (retryError) {
          return new Response(JSON.stringify({ error: 'Request failed because the connection was closed or the network was unavailable' }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' },
          });
        }
      }

      if (secondaryUrl && fetchUrl === primaryUrl) {
        console.warn("[apiFetch] primary /api request failed, retrying against remote API", { primaryUrl, secondaryUrl, error });
        try {
          return await fetchWithRetry(secondaryUrl, init);
        } catch (retryError) {
          return new Response(JSON.stringify({ error: 'Request failed because the connection was closed or the network was unavailable' }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' },
          });
        }
      }

      if (!secondaryUrl) {
        return new Response(JSON.stringify({ error: 'Request failed because the connection was closed or the network was unavailable' }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        });
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
    return await attemptFetch(secondaryUrl);
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
  // Ask Supabase for the current session so an inactive tab cannot reuse an expired bearer token.
  const token = await resolveAuthToken(true);
  const effectiveToken = token || supabaseAnonKey;
  const primaryUrl = resolveApiUrl(input);
  const mutationMethod = (init?.method || "GET").toUpperCase();
  const csrfHeaders: Record<string, string> = {};

  if (mutationMethod !== "GET" && mutationMethod !== "HEAD") {
    const session = await ensureCsrfSession(effectiveToken);
    csrfHeaders["X-Session-Id"] = session.sessionId;
    csrfHeaders["X-CSRF-Token"] = session.csrfToken;
  }

  if (import.meta.env.DEV) {
    console.debug("[apiFetch] resolved URL", {
      input,
      primaryUrl,
      hasToken: Boolean(token),
      usingAnonKey: Boolean(!token && effectiveToken),
      csrfRequired: mutationMethod !== "GET" && mutationMethod !== "HEAD",
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
      ...csrfHeaders,
    },
  });

  let res: Response;
  try {
    res = await fetchWithRemoteFallback(primaryUrl, buildRequest(effectiveToken));
  } catch (error) {
    console.warn("[apiFetch] request failed before response", error);
    return new Response(JSON.stringify({ error: "Request timed out" }), {
      status: 504,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (res.ok) {
    return res;
  }

  if (res.status === 401) {
    clearStoredAuthState();
    const refreshedToken = await resolveAuthToken(true);
    const retryToken = refreshedToken || supabaseAnonKey;
    if (retryToken && retryToken !== effectiveToken) {
      try {
        const retryRes = await fetchWithRemoteFallback(primaryUrl, buildRequest(retryToken));
        if (retryRes.ok) {
          return retryRes;
        }
        return retryRes;
      } catch (retryError) {
        console.warn("[apiFetch] retry request failed", retryError);
        return new Response(JSON.stringify({ error: "Request timed out" }), {
          status: 504,
          headers: { "Content-Type": "application/json" },
        });
      }
    }
  }

  if (import.meta.env.DEV && localFallbackBase && primaryUrl.startsWith(normalizeBase(apiBaseUrl))) {
    const fallbackUrl = resolveLocalApiUrl(input);
    console.warn(`[apiFetch] Primary API failed with ${res.status}. Trying local fallback: ${fallbackUrl}`);
    return fetchWithRemoteFallback(fallbackUrl, buildRequest(token));
  }
  return res;
}
