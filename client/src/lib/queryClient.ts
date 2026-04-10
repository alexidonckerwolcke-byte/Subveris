import { QueryClient, QueryFunction } from "@tanstack/react-query";

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
  const headers: Record<string, string> = {};
  
  if (data) {
    headers["Content-Type"] = "application/json";
  }
  
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
      console.warn('[apiRequest] Failed to parse token from localStorage:', e);
    }
  } else {
    console.warn('[apiRequest] No token found in localStorage for url:', url);
  }

  console.debug('[apiRequest] Fetching', method, url, 'headers:', headers, 'body:', data ? data : undefined);

  const res = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

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

    const res = await fetch(queryKey.join("/") as string, {
      headers,
      credentials: "include",
    });

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
