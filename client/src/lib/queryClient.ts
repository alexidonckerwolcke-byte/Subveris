import { dehydrate, hydrate, QueryClient, QueryFunction } from "@tanstack/react-query";
import { apiFetch, clearStoredAuthState, fetchWithRemoteFallback, resolveApiUrl, resolveAuthToken } from "./api";
import { supabase } from "./supabase";
import { getAccountTimeZone } from "./account-time-zone";

function buildQueryPath(queryKey: unknown[]) {
  const pathSegments = queryKey
    .filter((segment) => segment !== null && segment !== undefined)
    .map((segment, index) => {
      const value = typeof segment === 'string' ? segment.trim() : String(segment);
      if (!value) return "";
      if (index === 0) {
        return value.replace(/\/+$/, "");
      }
      return value.replace(/^\/+|\/+$/g, "");
    })
    .filter(Boolean);

  if (pathSegments.length === 0) {
    return "";
  }

  const firstSegment = pathSegments[0];
  const restSegments = pathSegments.slice(1);
  return restSegments.length > 0 ? `${firstSegment}/${restSegments.join("/")}` : firstSegment;
}

function appendLocalTimeQuery(path: string) {
  if (
    !path.startsWith("/api/spending/") &&
    path !== "/api/metrics" &&
    !path.startsWith("/api/family-groups")
  ) {
    return path;
  }

  const localNow = new Date();
  const localDate = `${localNow.getFullYear()}-${String(localNow.getMonth() + 1).padStart(2, '0')}-${String(localNow.getDate()).padStart(2, '0')}`;
  const offsetMinutes = localNow.getTimezoneOffset();
  const separator = path.includes("?") ? "&" : "?";

  const result = `${path}${separator}localDate=${encodeURIComponent(localDate)}&offsetMinutes=${encodeURIComponent(String(offsetMinutes))}`;
  return result;
}

function appendAccountTimeZone(path: string) {
  if (!path.startsWith("/api") || /(?:\?|&)timeZone=/.test(path)) return path;
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}timeZone=${encodeURIComponent(getAccountTimeZone())}`;
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    let errorMessage = res.statusText || `HTTP ${res.status}`;
    try {
      const text = await res.text();
      if (text) {
        // Try to parse as JSON first
        try {
          const json = JSON.parse(text);
          errorMessage = json.error || json.message || text;
        } catch {
          // If not JSON, use the text directly
          errorMessage = text;
        }
      }
    } catch (e) {
      // If we can't read the response, use a generic message
      errorMessage = `Request failed with status ${res.status}`;
    }
    const error = new Error(errorMessage) as Error & { status?: number };
    error.status = res.status;
    throw error;
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const headers: Record<string, string> = {};
  if (data) {
    headers["Content-Type"] = "application/json";
  }

  const response = await apiFetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
  });
  await throwIfResNotOk(response);
  return response;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const headers: Record<string, string> = {};
    
    // Add authorization header if token exists
    const tokenStr = localStorage.getItem('supabase.auth.token');
    if (tokenStr) {
      try {
        const tokenObj = JSON.parse(tokenStr);
        if (tokenObj.access_token) {
          headers["Authorization"] = `Bearer ${tokenObj.access_token}`;
        } else if (typeof tokenObj === 'string') {
          headers["Authorization"] = `Bearer ${tokenObj}`;
        }
      } catch (e) {
        console.warn('[getQueryFn] Failed to parse token from localStorage:', e);
      }
    }

    let token = await resolveAuthToken(true);
    if (supabase) {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error || !session) {
        const authError = new Error(error?.message || "Authentication session is unavailable") as Error & { status?: number };
        authError.status = 401;
        throw authError;
      }
    }

    const queryPath = buildQueryPath(queryKey as unknown[]);
    const queryPathWithLocal = appendAccountTimeZone(appendLocalTimeQuery(queryPath));
    
    // Always use the backend API directly, don't use the client-side Supabase bridge
    // The bridge has RLS and policy issues
    
    const fetchUrl = resolveApiUrl(queryPathWithLocal);

    const makeRequest = async (authToken: string | null) => {
      return await fetchWithRemoteFallback(fetchUrl, {
        headers: {
          ...headers,
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        mode: "cors",
        credentials: "omit",
        cache: "no-store",
      });
    };

    let res = await makeRequest(token);
    if (res.status === 401) {
      token = await resolveAuthToken(true);
      if (token) {
        res = await makeRequest(token);
      }
    }

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: true,
      staleTime: 30_000,
      retry: (failureCount, error) => {
        const status = (error as Error & { status?: number })?.status;
        if (status && status >= 400 && status < 500 && status !== 408 && status !== 429) return false;
        return failureCount < 2;
      },
    },
    mutations: {
      retry: false,
    },
  },
});

const QUERY_CACHE_PREFIX = "subveris.query-cache.v1:";
let activeQueryCacheUserId: string | null = null;
let restoringQueryCache = false;

function getQueryCacheKey(userId: string) {
  return `${QUERY_CACHE_PREFIX}${userId}`;
}

function persistQueryCache() {
  if (typeof window === "undefined" || !activeQueryCacheUserId || restoringQueryCache) return;
  try {
    const cache = dehydrate(queryClient, {
      shouldDehydrateQuery: (query) =>
        query.state.status === "success" &&
        typeof query.queryKey[0] === "string" &&
        query.queryKey[0].startsWith("/api/"),
    });
    window.sessionStorage.setItem(getQueryCacheKey(activeQueryCacheUserId), JSON.stringify(cache));
  } catch (error) {
    console.warn("[QueryCache] Could not persist session query data:", error);
  }
}

export function restoreQueryCacheForUser(userId: string | null) {
  if (typeof window === "undefined" || activeQueryCacheUserId === userId) return;

  const previousUserId = activeQueryCacheUserId;
  let savedCache: string | null = null;
  try {
    savedCache = userId ? window.sessionStorage.getItem(getQueryCacheKey(userId)) : null;
  } catch (error) {
    console.warn("[QueryCache] Could not read session query data:", error);
  }

  restoringQueryCache = true;
  activeQueryCacheUserId = userId;
  queryClient.clear();
  if (previousUserId && previousUserId !== userId) {
    try {
      window.sessionStorage.removeItem(getQueryCacheKey(previousUserId));
    } catch (error) {
      console.warn("[QueryCache] Could not clear previous user's cached data:", error);
    }
  }

  if (savedCache && userId) {
    try {
      hydrate(queryClient, JSON.parse(savedCache));
    } catch (error) {
      console.warn("[QueryCache] Discarding invalid session query data:", error);
      window.sessionStorage.removeItem(getQueryCacheKey(userId));
    }
  }

  restoringQueryCache = false;
  persistQueryCache();
}

queryClient.getQueryCache().subscribe((event) => {
  if (event.type === "updated" && event.action.type === "success") {
    persistQueryCache();
  }
});
