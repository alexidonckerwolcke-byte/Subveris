import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { fetchWithRemoteFallback, resolveApiUrl } from "./api";
import { supabase } from "./supabase";

async function resolveAuthToken(forceRefresh = false) {
  const tokenStr = localStorage.getItem('supabase.auth.token');
  if (!forceRefresh && tokenStr) {
    try {
      const tokenObj = JSON.parse(tokenStr);
      if (tokenObj?.access_token) return tokenObj.access_token;
      if (typeof tokenObj === 'string') return tokenObj;
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
      localStorage.setItem('supabase.auth.token', JSON.stringify({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
      }));
      return session.access_token;
    }
  }

  return null;
}

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
    throw new Error(errorMessage);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  // Always use the backend API instead of client-side Supabase bridge
  // The bridge has issues with RLS policies and malformed queries
  
  const headers: Record<string, string> = {};
  
  if (data) {
    headers["Content-Type"] = "application/json";
  }
  
  // Add authorization header if token exists.
  // If our custom localStorage token isn't set yet, try restoring the Supabase session.
  let token: string | null = null;
  const tokenStr = localStorage.getItem('supabase.auth.token');
  if (tokenStr) {
    try {
      const tokenObj = JSON.parse(tokenStr);
      if (tokenObj.access_token) {
        token = tokenObj.access_token;
      } else if (typeof tokenObj === 'string') {
        token = tokenObj;
      }
    } catch (e) {
      console.warn('[apiRequest] Failed to parse token from localStorage:', e);
    }
  }

  if (!token) {
    token = await resolveAuthToken(true);
  }

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  } else {
    console.warn('[apiRequest] No token found for url:', url);
  }

  const fetchUrl = resolveApiUrl(url);
  console.debug('[apiRequest] Fetching', method, fetchUrl, 'headers:', headers, 'body:', data ? data : undefined);

  let res = await fetchWithRemoteFallback(fetchUrl, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
  });

  if (!res.ok && res.status === 401) {
    const refreshedToken = await resolveAuthToken(true);
    if (refreshedToken && refreshedToken !== token) {
      headers["Authorization"] = `Bearer ${refreshedToken}`;
      res = await fetchWithRemoteFallback(fetchUrl, {
        method,
        headers,
        body: data ? JSON.stringify(data) : undefined,
      });
    }
  }

  if (!res.ok) {
    let errorMessage = res.statusText || `HTTP ${res.status}`;
    try {
      const text = await res.text();
      console.warn('[apiRequest] Non-OK response', res.status, url, text);
      if (text) {
        try {
          const json = JSON.parse(text);
          errorMessage = json.error || json.message || text;
        } catch {
          errorMessage = text;
        }
      }
    } catch (e) {
      console.warn('[apiRequest] Non-OK response', res.status, url, '(could not read body)');
      errorMessage = `Request failed with status ${res.status}`;
    }
    throw new Error(errorMessage);
  }

  return res;
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
    const queryPath = buildQueryPath(queryKey as unknown[]);
    const queryPathWithLocal = appendLocalTimeQuery(queryPath);
    
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
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
