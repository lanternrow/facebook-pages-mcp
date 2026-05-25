/**
 * Insights tools: get_page_insights, get_video_insights
 *
 * IMPORTANT — Metric deprecation notice (Graph API v25.0):
 * As of June 15, 2026, the following legacy Page-level metrics are DEPRECATED
 * and will no longer return data:
 *   - page_impressions (and all sub-metrics)
 *   - page_reach (and all sub-metrics)
 *   - page_impressions_unique
 *
 * They are replaced by the Page Viewer / Media Views metric family.
 * This server uses the NEW metrics by default: page_views_total, page_fans,
 * page_fan_adds, page_fan_removes, page_actions_post_reactions_total.
 *
 * See: https://developers.facebook.com/docs/graph-api/reference/page/insights
 */

import { z } from "zod";
import { graphRequest, getDefaultPageId } from "../client.js";
import type { InsightsResponse, VideoInsightMetric } from "../types.js";

// ─── Page Insights ─────────────────────────────────────────────────

/**
 * New (non-deprecated) page-level metrics available in Graph API v25.0.
 * DO NOT use: page_impressions, page_reach, page_impressions_unique — they are
 * deprecated as of June 15, 2026.
 */
const ALLOWED_PAGE_METRICS = [
  "page_views_total",
  "page_fans",
  "page_fan_adds",
  "page_fan_removes",
  "page_actions_post_reactions_total",
] as const;

export const getPageInsightsSchema = z.object({
  page_id: z
    .string()
    .optional()
    .describe("Facebook Page ID. Defaults to FB_PAGE_ID env var if omitted."),
  metrics: z
    .array(z.string())
    .optional()
    .describe(
      `Metrics to retrieve. Defaults to all supported metrics: ${ALLOWED_PAGE_METRICS.join(", ")}. ` +
        "NOTE: page_impressions, page_reach, and page_impressions_unique are DEPRECATED (June 2026) and should not be used."
    ),
  period: z
    .enum(["day", "week", "days_28"])
    .optional()
    .default("day")
    .describe("Aggregation period: day, week, or days_28."),
  date_preset: z
    .string()
    .optional()
    .describe(
      "Date preset (e.g. last_7d, last_28d, last_30d, this_month). " +
        "Mutually exclusive with since/until."
    ),
  since: z
    .string()
    .optional()
    .describe("Start date (YYYY-MM-DD) for the query range. Use with 'until'."),
  until: z
    .string()
    .optional()
    .describe("End date (YYYY-MM-DD) for the query range. Use with 'since'."),
});

/**
 * Retrieve page-level insights (analytics) for the specified metrics and period.
 *
 * Uses the non-deprecated metric set introduced in Graph API v18+.
 * Legacy metrics (page_impressions, page_reach) are intentionally excluded.
 */
export async function handleGetPageInsights(
  args: z.infer<typeof getPageInsightsSchema>
): Promise<InsightsResponse> {
  const pageId = args.page_id || getDefaultPageId();
  const metrics = args.metrics?.length
    ? args.metrics.join(",")
    : ALLOWED_PAGE_METRICS.join(",");

  const params: Record<string, string> = {
    metric: metrics,
    period: args.period ?? "day",
  };

  // Date filtering — date_preset is mutually exclusive with since/until
  if (args.date_preset) {
    params.date_preset = args.date_preset;
  } else {
    if (args.since) params.since = args.since;
    if (args.until) params.until = args.until;
  }

  return graphRequest<InsightsResponse>(`/${pageId}/insights`, params);
}

// ─── Video Insights ────────────────────────────────────────────────

const DEFAULT_VIDEO_METRICS = [
  "total_video_views",
  "total_video_impressions",
  "total_video_avg_time_watched",
  "total_video_view_total_time",
  "total_video_reactions_by_type_total",
] as const;

export const getVideoInsightsSchema = z.object({
  video_id: z.string().describe("The Facebook Video ID to retrieve insights for."),
  metrics: z
    .array(z.string())
    .optional()
    .describe(
      `Video metrics to retrieve. Defaults to: ${DEFAULT_VIDEO_METRICS.join(", ")}.`
    ),
});

/**
 * Retrieve performance metrics for a specific video post.
 */
export async function handleGetVideoInsights(
  args: z.infer<typeof getVideoInsightsSchema>
): Promise<{ metrics: VideoInsightMetric[] }> {
  const metrics = args.metrics?.length
    ? args.metrics.join(",")
    : DEFAULT_VIDEO_METRICS.join(",");

  const result = await graphRequest<{ data: VideoInsightMetric[] }>(
    `/${args.video_id}/video_insights`,
    { metric: metrics }
  );

  return { metrics: result.data };
}
