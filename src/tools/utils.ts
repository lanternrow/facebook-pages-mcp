/**
 * Utility tools: refresh_token_info
 */

import { z } from "zod";
import { graphRequest } from "../client.js";
import type { TokenDebugResponse } from "../types.js";

// ─── Schemas ───────────────────────────────────────────────────────

export const refreshTokenInfoSchema = z.object({
  token: z
    .string()
    .optional()
    .describe(
      "Access token to inspect. Defaults to the FB_PAGE_ACCESS_TOKEN env var."
    ),
});

// ─── Handler ───────────────────────────────────────────────────────

/**
 * Inspect the current (or provided) access token to check its validity,
 * expiration, and granted scopes. Useful for diagnosing auth issues or
 * knowing when a token refresh is needed.
 *
 * Uses the Graph API debug_token endpoint.
 */
export async function handleRefreshTokenInfo(
  args: z.infer<typeof refreshTokenInfoSchema>
): Promise<{
  is_valid: boolean;
  expires_at: string;
  scopes: string[];
  app_id: string;
  type: string;
  data_access_expires_at: string;
}> {
  const token = args.token || process.env.FB_PAGE_ACCESS_TOKEN;
  if (!token) {
    throw new Error(
      "No token provided and FB_PAGE_ACCESS_TOKEN is not set."
    );
  }

  const result = await graphRequest<TokenDebugResponse>("/debug_token", {
    input_token: token,
  });

  const data = result.data;

  return {
    is_valid: data.is_valid,
    expires_at: data.expires_at
      ? new Date(data.expires_at * 1000).toISOString()
      : "never (does not expire)",
    scopes: data.scopes,
    app_id: data.app_id,
    type: data.type,
    data_access_expires_at: data.data_access_expires_at
      ? new Date(data.data_access_expires_at * 1000).toISOString()
      : "unknown",
  };
}
