# FCM Stats Bot

FCM Stats Bot is a beginner-friendly Discord bot for an FC Mobile community. It uses `discord.js`, Node.js, and a local `players.json` file.

## Files

- `players.json` — the local starter database. Add or edit cards here using the existing shape.
- `src/player-store.js` — loads and validates the JSON data and provides search, ranking, and stat-name helpers. This is the only layer that needs to change when replacing JSON with CSV later.
- `src/commands.js` — defines and handles the Discord slash commands.
- `src/formatters.js` — turns player data into readable Discord embeds.
- `src/index.js` — starts the Discord client and registers the commands in one server using `GUILD_ID`.
- `.env.example` — documents the required environment variable names without containing a real token.

## Commands

- `/player <name>` — OVR, position, Pace, Shooting, Passing, Dribbling, Defending, and Physical.
- `/stats <name>` — every stat included on that card.
- `/compare <player1> <player2>` — OVR, positions, all stats, and a marker for the higher value.
- `/top10` — the ten highest OVR cards.
- `/top10 <position>` — the ten highest OVR cards at a position such as `ST`, `CAM`, `CM`, or `CB`.
- `/search <name>` — matching cards.

## Run in Replit

1. Create a Discord application and bot at the Discord Developer Portal.
2. Regenerate the bot token if it has ever been pasted into chat or shared anywhere.
3. In Replit, add the new token as the secret `DISCORD_TOKEN`.
4. Add the Discord server ID as the non-secret variable `GUILD_ID`.
5. Invite the bot using an OAuth2 URL with the `bot` and `applications.commands` scopes. The bot needs the `Send Messages` permission.
6. Start the `FCM Stats Bot` workflow.

Guild command registration is used so new commands appear quickly in the selected server. Restarting the bot also refreshes the command definitions.

## Add more cards

Edit `players.json` and add another object with this shape:

```json
{
  "name": "Player Name",
  "ovr": 85,
  "position": "CM",
  "stats": {
    "Pace": 80,
    "Shooting": 75,
    "Passing": 88,
    "Dribbling": 84,
    "Defending": 70,
    "Physical": 78
  }
}
```

There is intentionally no web scraping, unofficial endpoint, updater, RSS system, PostgreSQL database, or meta-rating logic in this first version.