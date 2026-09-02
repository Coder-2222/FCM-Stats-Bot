import { EmbedBuilder } from "discord.js";
import { primaryStats } from "./player-store.js";

const BRAND_COLOR = 0x2f6fed;
const WIN_COLOR = "🟢";
const TIE_COLOR = "⚪";

function formatStatValue(value) {
  return typeof value === "number" ? String(value) : "—";
}

function playerTitle(player) {
  return `${player.name} · ${player.position} · OVR ${player.ovr}`;
}

function basicStatLines(player) {
  return primaryStats
    .map((statName) => `**${statName}:** ${formatStatValue(player.stats[statName])}`)
    .join("\n");
}

export function playerEmbed(player) {
  return new EmbedBuilder()
    .setColor(BRAND_COLOR)
    .setTitle(player.name)
    .setDescription(`**OVR ${player.ovr}** · ${player.position}`)
    .addFields({
      name: "Core attributes",
      value: basicStatLines(player),
      inline: true,
    })
    .setFooter({ text: "FCM Stats Bot · data from players.json" });
}

export function statsEmbed(player, statNames) {
  const lines = statNames.map(
    (statName) =>
      `**${statName}:** ${formatStatValue(player.stats[statName])}`,
  );

  const fields = [];
  for (let index = 0; index < lines.length; index += 20) {
    fields.push({
      name: index === 0 ? "Available statistics" : "More statistics",
      value: lines.slice(index, index + 20).join("\n") || "No statistics found.",
      inline: true,
    });
  }

  return new EmbedBuilder()
    .setColor(BRAND_COLOR)
    .setTitle(player.name)
    .setDescription(`**OVR ${player.ovr}** · ${player.position}`)
    .addFields(fields)
    .setFooter({ text: "FCM Stats Bot · data from players.json" });
}

function compareValue(left, right) {
  if (left === undefined && right === undefined) return "—";
  if (left === undefined) return `— | ${right} ${WIN_COLOR}`;
  if (right === undefined) return `${left} ${WIN_COLOR} | —`;
  if (left > right) return `${left} ${WIN_COLOR} | ${right}`;
  if (right > left) return `${left} | ${right} ${WIN_COLOR}`;
  return `${left} ${TIE_COLOR} | ${right} ${TIE_COLOR}`;
}

export function compareEmbed(left, right, statNames) {
  const rows = [
    `**OVR** ${compareValue(left.ovr, right.ovr)}`,
    `**Position** ${left.position} | ${right.position}`,
    ...statNames.map(
      (statName) =>
        `**${statName}** ${compareValue(left.stats[statName], right.stats[statName])}`,
    ),
  ];

  const fields = [];
  for (let index = 0; index < rows.length; index += 18) {
    fields.push({
      name: index === 0 ? `${left.name} | ${right.name}` : "More statistics",
      value: rows.slice(index, index + 18).join("\n"),
      inline: false,
    });
  }

  return new EmbedBuilder()
    .setColor(BRAND_COLOR)
    .setTitle("Player comparison")
    .setDescription("Format: left player | right player\n🟢 marks the higher value.")
    .addFields(fields)
    .setFooter({ text: "FCM Stats Bot · data from players.json" });
}

export function top10Embed(players, position) {
  const title = position ? `Top 10 ${position} cards` : "Top 10 cards";
  const description = players.length
    ? players
        .map(
          (player, index) =>
            `**${index + 1}. ${player.name}** — OVR ${player.ovr} · ${player.position}`,
        )
        .join("\n")
    : "No cards found for that position.";

  return new EmbedBuilder()
    .setColor(BRAND_COLOR)
    .setTitle(title)
    .setDescription(description)
    .setFooter({ text: "FCM Stats Bot · sorted by OVR" });
}

export function searchEmbed(searchTerm, matches) {
  const description = matches.length
    ? matches
        .slice(0, 15)
        .map(
          (player) =>
            `**${player.name}** — OVR ${player.ovr} · ${player.position}`,
        )
        .join("\n")
    : `No cards matched "${searchTerm}".`;

  return new EmbedBuilder()
    .setColor(BRAND_COLOR)
    .setTitle(`Search results for "${searchTerm}"`)
    .setDescription(description)
    .setFooter({
      text:
        matches.length > 15
          ? "Showing the first 15 matches."
          : "FCM Stats Bot · search is case-insensitive",
    });
}

export function helpText() {
  return [
    "**FCM Stats Bot commands**",
    "`/player <name>` — show core player attributes",
    "`/stats <name>` — show every statistic available for that card",
    "`/compare <player1> <player2>` — compare two cards",
    "`/top10` — show the ten highest OVR cards",
    "`/top10 <position>` — show the ten highest OVR cards for a position",
    "`/search <name>` — find matching cards",
  ].join("\n");
}