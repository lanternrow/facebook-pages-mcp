/**
 * Page-level tools: get_page_info, get_page_feed
 */

import { z } from "zod";
import { graphRequest, graphPaginatedRequest, getDefaultPageId } from "../client.js";
import type { PageInfo, Post } from "../types.js";

// ─── Schemas ───────────────────────────────────────────────────────

export const getPageInfoSchema = z.object({
  page_id: z
    .string()
    .optional()
    .describe("Facebook Page ID. Defaults to FB_PAGE_ID env var if omitted."),
});

export const getPageFeedSchema = z.object({
  page_id: z
    .string()
    .optional()
    .describe("Facebook Page ID. Defaults to FB_PAGE_ID env var if omitted."),
  limit: z
    .number()
    .int()
    .min(1)
    .max(100)
    .optional()
    .default(25)
    .describe("Number of feed items to return (1-100, default 25)."),
  after: z
    .string()
    .optional()
    .describe("Pagination cursor — pass the value from a previous response to get the next page."),
});

// ─── Handlers ──────────────────────────────────────────────────────

/**
 * Retrieve metadata for a Facebook Page including name, category,
 * follower count, contact info, location, hours, and cover photo.
 */
export async function handleGetPageInfo(
  args: z.infer<typeof getPageInfoSchema>
): Promise<PageInfo> {
  const pageId = args.page_id || getDefaultPageId();
  const fields = [
    "id",
    "name",
    "about",
    "category",
    "fan_count",
    "followers_count",
    "link",
    "website",
    "phone",
    "emails",
    "location",
    "hours",
    "cover",
  ].join(",");

  return graphRequest<PageInfo>(`/${pageId}`, { fields });
}

/**
 * Retrieve the full page feed, including visitor posts.
 * Unlike published_posts, this includes posts by others on the page.
 */
export async function handleGetPageFeed(
  args: z.infer<typeof getPageFeedSchema>
): Promise<{ posts: Post[]; has_more: boolean }> {
  const pageId = args.page_id || getDefaultPageId();
  // NOTE: 'type' field is deprecated in Graph API v3.3+
  const fields = "id,message,from,created_time,permalink_url";
  const params: Record<string, string> = {
    fields,
    limit: String(args.limit ?? 25),
  };
  if (args.after) {
    params.after = args.after;
  }

  const result = await graphPaginatedRequest<Post>(`/${pageId}/feed`, params);
  return { posts: result.data, has_more: result.hasMore };
}
