import { Client, Events, GatewayIntentBits, REST, Routes } from "discord.js";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { commandDefinitions, handleInteraction } from "./commands.js";
import { PlayerStore } from "./player-store.js";

const token = process.env.DISCORD_TOKEN;
const guildId = process.env.GUILD_ID;

if (!token) {
  throw new Error(
    "DISCORD_TOKEN is missing. Add it as a Replit Secret before starting the bot.",
  );
}

if (!guildId) {
  throw new Error(
    "GUILD_ID is missing. Add the ID of the Discord server where commands should be registered.",
  );
}

const packageRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const store = new PlayerStore(resolve(packageRoot, "players.json"));
await store.load();

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

async function registerGuildCommands(applicationId) {
  const rest = new REST({ version: "10" }).setToken(token);
  await rest.put(Routes.applicationGuildCommands(applicationId, guildId), {
    body: commandDefinitions.map((command) => command.toJSON()),
  });
}

client.once(Events.ClientReady, async (readyClient) => {
  try {
    await registerGuildCommands(readyClient.user.id);
    console.info(
      `FCM Stats Bot is online as ${readyClient.user.tag}. Registered ${commandDefinitions.length} guild commands.`,
    );
  } catch (error) {
    console.error("The bot connected, but slash-command registration failed.", error);
    await readyClient.destroy();
    process.exit(1);
  }
});

client.on(Events.InteractionCreate, async (interaction) => {
  try {
    await handleInteraction(interaction, store);
  } catch (error) {
    console.error("A command failed.", error);
    const message = "Something went wrong while handling that command.";
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ content: message, ephemeral: true });
    } else {
      await interaction.reply({ content: message, ephemeral: true });
    }
  }
});

process.on("SIGINT", () => client.destroy());
process.on("SIGTERM", () => client.destroy());

await client.login(token);