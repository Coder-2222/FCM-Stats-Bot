# FCM Stats Bot

An FC Mobile community Discord bot that serves player statistics from a local JSON database.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm --filter @workspace/fcm-stats-bot run dev` — run the Discord bot
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required bot env: `DISCORD_TOKEN` (secret) and `GUILD_ID` (Discord server ID)
- The bot uses `services/fcm-stats-bot/players.json`; it does not use the pre-configured PostgreSQL database.

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `services/fcm-stats-bot/src/index.js` — Discord client startup and slash-command registration
- `services/fcm-stats-bot/src/commands.js` — command definitions and handlers
- `services/fcm-stats-bot/src/player-store.js` — JSON database access and search/ranking helpers
- `services/fcm-stats-bot/src/formatters.js` — Discord response formatting
- `services/fcm-stats-bot/src/image-cards.js` — generated PNG card rendering
- `services/fcm-stats-bot/players.json` — sample player database

## Architecture decisions

- Guild-scoped command registration is used so commands appear quickly in the test server.
- The data access is isolated behind `PlayerStore` so a future CSV or larger database can replace the JSON source without rewriting command handlers.
- Discord commands return generated PNG cards; optional card art is read from local paths in the player records.
- Only Discord's `Guilds` intent is enabled because the bot only needs slash-command interactions.

## Product

FCM Stats Bot supports image-based player lookup, full-stat lookup, side-by-side comparisons, OVR leaderboards, position-filtered leaderboards, name search, and per-card shard cost display.

## User preferences

- Keep the first version simple and local: no scraping, unofficial/private APIs, updater, RSS, PostgreSQL, or meta-rating system.

## Gotchas

- The bot will fail fast with a clear message until `DISCORD_TOKEN` and `GUILD_ID` are configured.
- If the bot token has been shared, regenerate it in Discord before adding it to Replit Secrets.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
