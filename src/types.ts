/**
 * TypeScript types for Meta Graph API v25.0 responses
 * used by the Facebook Pages MCP server.
 */

// ─── Graph API Error ───────────────────────────────────────────────

export interface GraphAPIError {
  error: {
    message: string;
    type: string;
    code: number;
    error_subcode?: number;
    fbtrace_id?: string;
  };
}

// ─── Pagination ────────────────────────────────────────────────────

export interface PagingCursors {
  before?: string;
  after?: string;
}

export interface Paging {
  cursors?: PagingCursors;
  previous?: string;
  next?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  paging?: Paging;
}

// ─── Rate Limit Headers ────────────────────────────────────────────

export interface RateLimitInfo {
  callCount?: number;
  totalCPUTime?: number;
  totalTime?: number;
}

// ─── Page ──────────────────────────────────────────────────────────

export interface PageLocation {
  city?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  state?: string;
  street?: string;
  zip?: string;
}

export interface CoverPhoto {
  cover_id: string;
  offset_x: number;
  offset_y: number;
  source: string;
  id: string;
}

export interface PageInfo {
  id: string;
  name?: string;
  about?: string;
  category?: string;
  fan_count?: number;
  followers_count?: number;
  link?: string;
  website?: string;
  phone?: string;
  emails?: string[];
  location?: PageLocation;
  hours?: Record<string, string>;
  cover?: CoverPhoto;
}

// ─── Insights ──────────────────────────────────────────────────────

export interface InsightValue {
  value: number | Record<string, number>;
  end_time: string;
}

export interface InsightMetric {
  id: string;
  name: string;
  period: string;
  title: string;
  description: string;
  values: InsightValue[];
}

export interface InsightsResponse {
  data: InsightMetric[];
  paging?: Paging;
}

// ─── Posts ──────────────────────────────────────────────────────────

export interface PostShares {
  count: number;
}

export interface Post {
  id: string;
  message?: string;
  created_time: string;
  full_picture?: string;
  permalink_url?: string;
  shares?: PostShares;
  // NOTE: 'type' and 'status_type' are deprecated in Graph API v3.3+
  from?: {
    name: string;
    id: string;
  };
}

// ─── Comments ──────────────────────────────────────────────────────

export interface Comment {
  id: string;
  message: string;
  from?: {
    name: string;
    id: string;
  };
  created_time: string;
  like_count?: number;
  comment_count?: number;
}

// ─── Video Insights ────────────────────────────────────────────────

export interface VideoInsightValue {
  value: number | Record<string, number>;
}

export interface VideoInsightMetric {
  id: string;
  name: string;
  period: string;
  title: string;
  description: string;
  values: VideoInsightValue[];
}

// ─── Token Debug ───────────────────────────────────────────────────

export interface TokenDebugData {
  app_id: string;
  type: string;
  application: string;
  data_access_expires_at: number;
  expires_at: number;
  is_valid: boolean;
  issued_at?: number;
  scopes: string[];
  granular_scopes?: Array<{
    scope: string;
    target_ids?: string[];
  }>;
  user_id?: string;
  page_id?: string;
}

export interface TokenDebugResponse {
  data: TokenDebugData;
}

// ─── Create Post ───────────────────────────────────────────────────

export interface CreatePostResponse {
  id: string;
}

// ─── Tool parameter types ──────────────────────────────────────────

export type InsightPeriod = "day" | "week" | "days_28";

export type DatePreset =
  | "today"
  | "yesterday"
  | "this_month"
  | "last_month"
  | "this_quarter"
  | "last_3d"
  | "last_7d"
  | "last_14d"
  | "last_28d"
  | "last_30d"
  | "last_90d"
  | "last_week_mon_sun"
  | "last_week_sun_sat"
  | "last_quarter"
  | "last_year"
  | "this_week_mon_today"
  | "this_week_sun_today"
  | "this_year";
