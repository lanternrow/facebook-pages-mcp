# facebook-pages-mcp

[![npm version](https://img.shields.io/npm/v/facebook-pages-mcp.svg)](https://www.npmjs.com/package/facebook-pages-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

MCP server for **Facebook Pages** organic analytics and management, powered by Meta Graph API **v25.0**.

Built for [Claude Code](https://claude.ai/claude-code) and any MCP-compatible AI tool. Gives your AI assistant direct access to your Facebook Page data — posts, insights, comments, and more.

## Why this exists

- **No good Facebook Pages MCP server existed.** Instagram has several. Facebook Pages had none that worked on a current API version.
- **Meta deprecated legacy metrics on June 15, 2026.** `page_impressions`, `page_reach`, and `page_impressions_unique` no longer return data. This server uses the replacement metrics from day one.
- **Business Manager support.** Most businesses manage Pages through Meta Business Manager, not personal accounts. This server works with both.

## Quick start

### Option 1: npx (no install)

```json
{
  "mcpServers": {
    "facebook-pages": {
      "command": "npx",
      "args": ["-y", "facebook-pages-mcp"],
      "env": {
        "FB_PAGE_ACCESS_TOKEN": "your_page_access_token",
        "FB_PAGE_ID": "your_page_id"
      }
    }
  }
}
```

### Option 2: Clone and build

```bash
git clone https://github.com/lanternrow/facebook-pages-mcp.git
cd facebook-pages-mcp
npm install
npm run build
```

Then add to your Claude Code MCP settings:

```json
{
  "mcpServers": {
    "facebook-pages": {
      "command": "node",
      "args": ["/path/to/facebook-pages-mcp/dist/index.js"],
      "env": {
        "FB_PAGE_ACCESS_TOKEN": "your_page_access_token",
        "FB_PAGE_ID": "your_page_id"
      }
    }
  }
}
```

## Getting your Page Access Token

### Step 1: Create a Meta App

1. Go to [Meta for Developers](https://developers.facebook.com/apps/) and click **Create App**
2. Name your app and choose the **"Manage everything on your Page"** use case
3. Connect it to your Business Portfolio

### Step 2: Generate a token in the Graph API Explorer

1. Open the [Graph API Explorer](https://developers.facebook.com/tools/explorer/)
2. Select your app from the **Meta App** dropdown
3. Add permissions: `pages_show_list`, `pages_read_engagement`, `business_management`
4. Click **Generate Access Token** and complete the OAuth flow
5. When asked about Pages, select **"Opt in to all current and future Pages"**

### Step 3: Get your Page Access Token

**If your Pages are managed through Business Manager** (most businesses):

```
# First, find your business ID
GET /me/businesses?fields=id,name

# Then get Page tokens for that business
GET /{business-id}/owned_pages?fields=id,name,access_token
```

**If your Pages are on your personal account:**

```
GET /me/accounts?fields=id,name,access_token
```

Copy the `access_token` and `id` for the Page you want.

### Step 4: Exchange for a long-lived token (recommended)

Short-lived tokens expire in ~1 hour. Exchange for a long-lived token (~60 days):

```
GET /oauth/access_token
  ?grant_type=fb_exchange_token
  &client_id={your-app-id}
  &client_secret={your-app-secret}
  &fb_exchange_token={short-lived-token}
```

> **Tip:** For Pages you admin, Page tokens derived from a long-lived User Token never expire.

## Tools

### Read tools

| Tool | Description |
|------|-------------|
| `get_page_info` | Page metadata: name, category, follower count, contact info, cover photo |
| `get_page_insights` | Page-level analytics with date ranges and period aggregation (day/week/28-day) |
| `get_published_posts` | Paginated list of posts authored by the Page |
| `get_post_insights` | Per-post engagement: impressions, clicks, reactions by type |
| `get_post_comments` | Paginated comments with author info and like/reply counts |
| `get_video_insights` | Video performance: views, watch time, reactions |
| `get_page_feed` | Full feed including visitor posts |

### Write tools

| Tool | Description |
|------|-------------|
| `create_post` | Publish text, link, or photo posts to the Page |

### Utility tools

| Tool | Description |
|------|-------------|
| `refresh_token_info` | Check token validity, expiration, and granted scopes |

## Metrics and the June 2026 deprecation

Meta deprecated these page-level metrics on June 15, 2026:

| Deprecated | Replacement |
|-----------|-------------|
| `page_impressions` | `page_views_total` |
| `page_reach` | Page Viewer metric (rolling out) |
| `page_impressions_unique` | Media Viewers metric (rolling out) |

This server uses only non-deprecated metrics: `page_views_total`, `page_fans`, `page_fan_adds`, `page_fan_removes`, `page_actions_post_reactions_total`.

## Architecture

```
src/
  index.ts          # MCP server entry point, tool registration
  client.ts         # Graph API HTTP client (native fetch, no dependencies)
  types.ts          # TypeScript interfaces for API responses
  tools/
    pages.ts        # get_page_info, get_page_feed
    insights.ts     # get_page_insights, get_video_insights
    posts.ts        # get_published_posts, get_post_insights, get_post_comments, create_post
    utils.ts        # refresh_token_info
```

- **Zero external HTTP dependencies** — uses Node 18+ native `fetch`
- **Rate limit tracking** — captures `x-app-usage` and `x-page-usage` headers
- **Cursor-based pagination** — all list endpoints support `after` cursor and configurable limits
- **Zod validation** — all tool inputs validated with descriptive error messages

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `FB_PAGE_ACCESS_TOKEN` | Yes | Long-lived Page Access Token |
| `FB_PAGE_ID` | Yes | Default Facebook Page ID (numeric) |

## Development

```bash
npm run dev    # Watch mode — recompiles on save
npm run build  # Production build
npm start      # Run the server
```

## Contributing

Issues and PRs welcome. If Meta changes the API (they will), please open an issue.

## License

MIT — see [LICENSE](LICENSE).

---

Built by [Lantern Row](https://lanternrow.com). Maintained as part of [The SEO Engine](https://github.com/lanternrow) toolkit.
