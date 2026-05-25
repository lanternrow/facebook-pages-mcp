#!/usr/bin/env node

/**
 * Facebook Pages MCP Server
 *
 * A Model Context Protocol server that wraps Meta's Graph API v25.0 to provide
 * organic Facebook Pages analytics and management tools for use with Claude Code.
 *
 * Auth: Requires a long-lived Page Access Token via FB_PAGE_ACCESS_TOKEN env var,
 * and a default Page ID via FB_PAGE_ID.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import {
  getPageInfoSchema,
  getPageFeedSchema,
  handleGetPageInfo,
  handleGetPageFeed,
} from "./tools/pages.js";

import {
  getPageInsightsSchema,
  getVideoInsightsSchema,
  handleGetPageInsights,
  handleGetVideoInsights,
} from "./tools/insights.js";

import {
  getPublishedPostsSchema,
  getPostInsightsSchema,
  getPostCommentsSchema,
  createPostSchema,
  handleGetPublishedPosts,
  handleGetPostInsights,
  handleGetPostComments,
  handleCreatePost,
} from "./tools/posts.js";

import {
  refreshTokenInfoSchema,
  handleRefreshTokenInfo,
} from "./tools/utils.js";

// ─── Server ────────────────────────────────────────────────────────

const server = new McpServer({
  name: "facebook-pages",
  version: "1.0.0",
});

// ─── Helper ────────────────────────────────────────────────────────

/**
 * Wrap a tool handler so that errors are returned as MCP text content
 * rather than crashing the server.
 */
function wrapHandler<TArgs, TResult>(
  fn: (args: TArgs) => Promise<TResult>
): (args: TArgs) => Promise<{ content: Array<{ type: "text"; text: string }> }> {
  return async (args: TArgs) => {
    try {
      const result = await fn(args);
      return {
        content: [
          { type: "text" as const, text: JSON.stringify(result, null, 2) },
        ],
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : String(error);
      return {
        content: [{ type: "text" as const, text: `Error: ${message}` }],
      };
    }
  };
}

// ─── Tool Registration ─────────────────────────────────────────────

// 1. get_page_info
server.tool(
  "get_page_info",
  "Retrieve Facebook Page metadata: name, category, follower count, contact info, location, hours, and cover photo.",
  getPageInfoSchema.shape,
  wrapHandler(handleGetPageInfo)
);

// 2. get_page_insights
server.tool(
  "get_page_insights",
  "Retrieve page-level analytics (page_views_total, page_fans, page_fan_adds, page_fan_removes, page_actions_post_reactions_total). Supports day/week/days_28 periods and date ranges. NOTE: Legacy metrics page_impressions and page_reach are deprecated as of June 2026.",
  getPageInsightsSchema.shape,
  wrapHandler(handleGetPageInsights)
);

// 3. get_published_posts
server.tool(
  "get_published_posts",
  "Retrieve a paginated list of posts published by the page, including message, image, permalink, shares, and type.",
  getPublishedPostsSchema.shape,
  wrapHandler(handleGetPublishedPosts)
);

// 4. get_post_insights
server.tool(
  "get_post_insights",
  "Retrieve engagement metrics for a specific post: impressions, engaged users, clicks, reactions by type, and activity by action type.",
  getPostInsightsSchema.shape,
  wrapHandler(handleGetPostInsights)
);

// 5. get_post_comments
server.tool(
  "get_post_comments",
  "Retrieve paginated comments on a specific post, including author, timestamp, like count, and reply count.",
  getPostCommentsSchema.shape,
  wrapHandler(handleGetPostComments)
);

// 6. get_video_insights
server.tool(
  "get_video_insights",
  "Retrieve performance metrics for a specific video: views, impressions, average watch time, total watch time, and reactions by type.",
  getVideoInsightsSchema.shape,
  wrapHandler(handleGetVideoInsights)
);

// 7. get_page_feed
server.tool(
  "get_page_feed",
  "Retrieve the full page feed including visitor posts (unlike published_posts which only returns page-authored posts).",
  getPageFeedSchema.shape,
  wrapHandler(handleGetPageFeed)
);

// 8. create_post
server.tool(
  "create_post",
  "Create a new post on the Facebook Page. Supports text posts, link posts, and photo posts. Returns the new post ID.",
  createPostSchema.shape,
  wrapHandler(handleCreatePost)
);

// 9. refresh_token_info
server.tool(
  "refresh_token_info",
  "Inspect the current access token to check validity, expiration date, and granted scopes. Useful for diagnosing auth issues.",
  refreshTokenInfoSchema.shape,
  wrapHandler(handleRefreshTokenInfo)
);

// ─── Start ─────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Facebook Pages MCP server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error starting server:", error);
  process.exit(1);
});
