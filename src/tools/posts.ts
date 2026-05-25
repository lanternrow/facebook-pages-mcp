/**
 * Post-level tools: get_published_posts, get_post_insights,
 * get_post_comments, create_post
 *
 * Post metric deprecation note (Graph API v25.0):
 * Some post-level metrics may be affected by the June 2026 deprecation wave.
 * The metrics used here (post_impressions, post_engaged_users, post_clicks,
 * post_reactions_by_type_total, post_activity_by_action_type) remain available
 * in v25.0 but should be monitored for future deprecation announcements.
 * See: https://developers.facebook.com/docs/graph-api/reference/post/insights
 */

import { z } from "zod";
import {
  graphRequest,
  graphPaginatedRequest,
  getDefaultPageId,
} from "../client.js";
import type {
  Post,
  InsightsResponse,
  Comment,
  CreatePostResponse,
} from "../types.js";

// ─── Get Published Posts ───────────────────────────────────────────

export const getPublishedPostsSchema = z.object({
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
    .describe("Number of posts to return (1-100, default 25)."),
  after: z
    .string()
    .optional()
    .describe("Pagination cursor for the next page of results."),
});

/**
 * Retrieve published posts authored by the page.
 * This does NOT include visitor posts — use get_page_feed for those.
 */
export async function handleGetPublishedPosts(
  args: z.infer<typeof getPublishedPostsSchema>
): Promise<{ posts: Post[]; has_more: boolean }> {
  const pageId = args.page_id || getDefaultPageId();
  // NOTE: 'type' and 'status_type' fields are deprecated in Graph API v3.3+
  const fields =
    "id,message,created_time,full_picture,permalink_url,shares";
  const params: Record<string, string> = {
    fields,
    limit: String(args.limit ?? 25),
  };
  if (args.after) {
    params.after = args.after;
  }

  const result = await graphPaginatedRequest<Post>(
    `/${pageId}/published_posts`,
    params
  );
  return { posts: result.data, has_more: result.hasMore };
}

// ─── Get Post Insights ─────────────────────────────────────────────

/**
 * Post-level metrics. These remain available as of v25.0 but may be
 * subject to future deprecation. Monitor Meta's changelog.
 */
const DEFAULT_POST_METRICS = [
  "post_impressions",
  "post_engaged_users",
  "post_clicks",
  "post_reactions_by_type_total",
  "post_activity_by_action_type",
] as const;

export const getPostInsightsSchema = z.object({
  post_id: z
    .string()
    .describe("The Facebook Post ID (format: pageId_postId)."),
  metrics: z
    .array(z.string())
    .optional()
    .describe(
      `Metrics to retrieve. Defaults to: ${DEFAULT_POST_METRICS.join(", ")}.`
    ),
});

/**
 * Retrieve engagement metrics for a specific post.
 */
export async function handleGetPostInsights(
  args: z.infer<typeof getPostInsightsSchema>
): Promise<InsightsResponse> {
  const metrics = args.metrics?.length
    ? args.metrics.join(",")
    : DEFAULT_POST_METRICS.join(",");

  return graphRequest<InsightsResponse>(`/${args.post_id}/insights`, {
    metric: metrics,
  });
}

// ─── Get Post Comments ─────────────────────────────────────────────

export const getPostCommentsSchema = z.object({
  post_id: z
    .string()
    .describe("The Facebook Post ID to retrieve comments for."),
  limit: z
    .number()
    .int()
    .min(1)
    .max(100)
    .optional()
    .default(25)
    .describe("Number of comments to return (1-100, default 25)."),
  after: z
    .string()
    .optional()
    .describe("Pagination cursor for the next page of comments."),
});

/**
 * Retrieve comments on a specific post, including author info and like/reply counts.
 */
export async function handleGetPostComments(
  args: z.infer<typeof getPostCommentsSchema>
): Promise<{ comments: Comment[]; has_more: boolean }> {
  const fields = "id,message,from,created_time,like_count,comment_count";
  const params: Record<string, string> = {
    fields,
    limit: String(args.limit ?? 25),
  };
  if (args.after) {
    params.after = args.after;
  }

  const result = await graphPaginatedRequest<Comment>(
    `/${args.post_id}/comments`,
    params
  );
  return { comments: result.data, has_more: result.hasMore };
}

// ─── Create Post ───────────────────────────────────────────────────

export const createPostSchema = z.object({
  page_id: z
    .string()
    .optional()
    .describe("Facebook Page ID. Defaults to FB_PAGE_ID env var if omitted."),
  message: z
    .string()
    .optional()
    .describe("Text content of the post."),
  link: z
    .string()
    .url()
    .optional()
    .describe("URL to share as a link post."),
  photo_url: z
    .string()
    .url()
    .optional()
    .describe(
      "Public URL of an image to post as a photo post. " +
        "The image must be publicly accessible."
    ),
});

/**
 * Create a new post on the Facebook Page.
 * Supports text-only posts, link posts, and photo posts.
 *
 * - Text post: provide `message` only
 * - Link post: provide `message` (optional) + `link`
 * - Photo post: provide `message` (optional) + `photo_url`
 *
 * Returns the new post ID.
 */
export async function handleCreatePost(
  args: z.infer<typeof createPostSchema>
): Promise<CreatePostResponse> {
  const pageId = args.page_id || getDefaultPageId();

  if (!args.message && !args.link && !args.photo_url) {
    throw new Error(
      "At least one of message, link, or photo_url must be provided."
    );
  }

  // Photo posts go to /{page-id}/photos, everything else to /{page-id}/feed
  if (args.photo_url) {
    const body: Record<string, unknown> = { url: args.photo_url };
    if (args.message) body.message = args.message;
    return graphRequest<CreatePostResponse>(
      `/${pageId}/photos`,
      {},
      "POST",
      body
    );
  }

  const body: Record<string, unknown> = {};
  if (args.message) body.message = args.message;
  if (args.link) body.link = args.link;

  return graphRequest<CreatePostResponse>(`/${pageId}/feed`, {}, "POST", body);
}
