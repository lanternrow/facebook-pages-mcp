/**
 * Shared Graph API HTTP client for the Facebook Pages MCP server.
 *
 * Uses native `fetch` (Node 18+). No external HTTP libraries required.
 * Handles authentication, error parsing, pagination, and rate-limit tracking.
 */

import type { GraphAPIError, RateLimitInfo } from "./types.js";

const GRAPH_API_BASE = "https://graph.facebook.com/v25.0";

/** Last known rate-limit usage from x-app-usage / x-page-usage headers. */
let lastAppUsage: RateLimitInfo | null = null;
let lastPageUsage: RateLimitInfo | null = null;

/**
 * Return the most recent rate-limit info captured from response headers.
 */
export function getRateLimitInfo(): {
  app: RateLimitInfo | null;
  page: RateLimitInfo | null;
} {
  return { app: lastAppUsage, page: lastPageUsage };
}

/**
 * Parse the JSON rate-limit header value returned by Meta.
 * The header contains a JSON object like: {"call_count":28,"total_cputime":25,"total_time":30}
 */
function parseRateLimitHeader(header: string | null): RateLimitInfo | null {
  if (!header) return null;
  try {
    const parsed = JSON.parse(header) as Record<string, number>;
    return {
      callCount: parsed.call_count,
      totalCPUTime: parsed.total_cputime,
      totalTime: parsed.total_time,
    };
  } catch {
    return null;
  }
}

/**
 * Resolve the page access token. Reads from the environment on every call
 * so that hot-reloads or token refreshes are picked up.
 */
function getAccessToken(): string {
  const token = process.env.FB_PAGE_ACCESS_TOKEN;
  if (!token) {
    throw new Error(
      "FB_PAGE_ACCESS_TOKEN environment variable is not set. " +
        "Provide a long-lived Page Access Token to authenticate with the Graph API."
    );
  }
  return token;
}

/**
 * Resolve the default page ID from the environment.
 */
export function getDefaultPageId(): string {
  const pageId = process.env.FB_PAGE_ID;
  if (!pageId) {
    throw new Error(
      "FB_PAGE_ID environment variable is not set. " +
        "Provide the numeric Facebook Page ID."
    );
  }
  return pageId;
}

/**
 * Type guard: check whether a parsed JSON body is a Graph API error.
 */
function isGraphError(body: unknown): body is GraphAPIError {
  return (
    typeof body === "object" &&
    body !== null &&
    "error" in body &&
    typeof (body as GraphAPIError).error?.message === "string"
  );
}

/**
 * Core request function. Builds the full URL, attaches the access token,
 * captures rate-limit headers, and converts Graph API errors into thrown
 * `Error` instances with actionable messages.
 *
 * @param path   - Graph API path, e.g. "/{page-id}" or "/debug_token"
 * @param params - Additional query-string parameters (access_token added automatically)
 * @param method - HTTP method (default GET)
 * @param body   - Optional JSON body for POST/PUT
 */
export async function graphRequest<T>(
  path: string,
  params: Record<string, string> = {},
  method: "GET" | "POST" | "DELETE" = "GET",
  body?: Record<string, unknown>
): Promise<T> {
  const accessToken = getAccessToken();

  const url = new URL(`${GRAPH_API_BASE}${path}`);
  url.searchParams.set("access_token", accessToken);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") {
      url.searchParams.set(key, value);
    }
  }

  const fetchOptions: RequestInit = {
    method,
    headers: {
      Accept: "application/json",
    },
  };

  if (body && method === "POST") {
    fetchOptions.headers = {
      ...fetchOptions.headers,
      "Content-Type": "application/json",
    };
    fetchOptions.body = JSON.stringify(body);
  }

  const response = await fetch(url.toString(), fetchOptions);

  // Capture rate-limit headers
  lastAppUsage =
    parseRateLimitHeader(response.headers.get("x-app-usage")) ?? lastAppUsage;
  lastPageUsage =
    parseRateLimitHeader(response.headers.get("x-page-usage")) ??
    lastPageUsage;

  const json: unknown = await response.json();

  if (!response.ok || isGraphError(json)) {
    const err = isGraphError(json) ? json.error : null;
    const message = err
      ? `Graph API error ${err.code}: ${err.message} (type: ${err.type})`
      : `Graph API returned HTTP ${response.status}`;
    throw new Error(message);
  }

  return json as T;
}

/**
 * Convenience wrapper for paginated GET endpoints.
 * Follows `paging.next` cursors up to `maxPages` (default 1 = no extra pages).
 */
export async function graphPaginatedRequest<T>(
  path: string,
  params: Record<string, string> = {},
  maxPages: number = 1
): Promise<{ data: T[]; hasMore: boolean }> {
  interface PageResponse {
    data: T[];
    paging?: { next?: string };
  }

  const firstPage = await graphRequest<PageResponse>(path, params);
  const allData: T[] = firstPage.data ?? [];
  let nextUrl = firstPage.paging?.next;
  let pagesFollowed = 1;

  while (nextUrl && pagesFollowed < maxPages) {
    const response = await fetch(nextUrl, {
      headers: { Accept: "application/json" },
    });
    const json = (await response.json()) as PageResponse;
    if (json.data) {
      allData.push(...json.data);
    }
    nextUrl = json.paging?.next;
    pagesFollowed++;
  }

  return { data: allData, hasMore: !!nextUrl };
}
