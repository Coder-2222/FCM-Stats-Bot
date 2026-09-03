import { AttachmentBuilder, SlashCommandBuilder } from "discord.js";
import {
  helpText,
} from "./formatters.js";
import {
  renderComparisonCard,
  renderPlayerCard,
  renderSearchCard,
  renderTop10Card,
} from "./image-cards.js";
import { primaryStats } from "./player-store.js";

export const commandDefinitions = [
  new SlashCommandBuilder()
    .setName("player")
    .setDescription("Show a player's core FC Mobile attributes.")
    .addStringOption((option) =>
      option
        .setName("name")
        .setDescription("Player name, or part of a player name")
        .setRequired(true),
    ),
  new SlashCommandBuilder()
    .setName("stats")
    .setDescription("Show every available statistic for a player.")
    .addStringOption((option) =>
      option
        .setName("name")
        .setDescription("Player name, or part of a player name")
        .setRequired(true),
    ),
  new SlashCommandBuilder()
    .setName("compare")
    .setDescription("Compare two FC Mobile players side by side.")
    .addStringOption((option) =>
      option
        .setName("player1")
        .setDescription("First player name")
        .setRequired(true),
    )
    .addStringOption((option) =>
      option
        .setName("player2")
        .setDescription("Second player name")
        .setRequired(true),
    ),
  new SlashCommandBuilder()
    .setName("top10")
    .setDescription("Show the top 10 cards, optionally by position.")
    .addStringOption((option) =>
      option
        .setName("position")
        .setDescription("Position such as ST, CAM, CM, or CB")
        .setRequired(false),
    ),
  new SlashCommandBuilder()
    .setName("search")
    .setDescription("Search the player database for matching cards.")
    .addStringOption((option) =>
      option
        .setName("name")
        .setDescription("Player name, or part of a player name")
        .setRequired(true),
    ),
];

function noMatchMessage(name) {
  return `I couldn't find a card matching "${name}". Try \`/search ${name}\`.`;
}

function imageReply(card) {
  return {
    files: [new AttachmentBuilder(card.buffer, { name: card.fileName })],
  };
}

export async function handleInteraction(interaction, store) {
  if (!interaction.isChatInputCommand()) return;

  const commandName = interaction.commandName;
  if (commandName === "player") {
    const name = interaction.options.getString("name", true);
    const player = store.findBest(name);
    if (!player) return interaction.reply(noMatchMessage(name));
    return interaction.reply(
      imageReply(await renderPlayerCard(player, primaryStats, store.baseDir)),
    );
  }

  if (commandName === "stats") {
    const name = interaction.options.getString("name", true);
    const player = store.findBest(name);
    if (!player) return interaction.reply(noMatchMessage(name));
    return interaction.reply(
      imageReply(
        await renderPlayerCard(
          player,
          store.getAllStatNames([player]),
          store.baseDir,
        ),
      ),
    );
  }

  if (commandName === "compare") {
    const firstName = interaction.options.getString("player1", true);
    const secondName = interaction.options.getString("player2", true);
    const firstPlayer = store.findBest(firstName);
    const secondPlayer = store.findBest(secondName);
    if (!firstPlayer || !secondPlayer) {
      const missing = [
        !firstPlayer ? `"${firstName}"` : null,
        !secondPlayer ? `"${secondName}"` : null,
      ]
        .filter(Boolean)
        .join(" and ");
      return interaction.reply(`I couldn't find ${missing}.`);
    }

    return interaction.reply(
      imageReply(
        await renderComparisonCard(
          firstPlayer,
          secondPlayer,
          store.getAllStatNames([firstPlayer, secondPlayer]),
          store.baseDir,
        ),
      ),
    );
  }

  if (commandName === "top10") {
    const position = interaction.options.getString("position");
    return interaction.reply(
      imageReply(
        await renderTop10Card(
          store.getTop10(position),
          position,
          store.baseDir,
        ),
      ),
    );
  }

  if (commandName === "search") {
    const name = interaction.options.getString("name", true);
    return interaction.reply(
      imageReply(
        await renderSearchCard(name, store.findMatches(name), store.baseDir),
      ),
    );
  }

  return interaction.reply(helpText());
}