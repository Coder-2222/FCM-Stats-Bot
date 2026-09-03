import { readFile } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";
import sharp from "sharp";
import { primaryStats } from "./player-store.js";

const COLORS = {
  background: "#071311",
  backgroundGlow: "#0d2e28",
  panel: "#091817",
  panelAlt: "#101f1d",
  border: "#4b8f7b",
  borderBright: "#42e58f",
  text: "#f7fff9",
  muted: "#b5c7c0",
  green: "#49e878",
  red: "#f05a61",
  gold: "#f1d57a",
  cyan: "#26e6e1",
};

const statGroups = [
  {
    name: "PACE",
    stats: ["Acceleration", "Sprint Speed"],
    icon: "➤",
  },
  {
    name: "SHOOTING",
    stats: [
      "Finishing",
      "Long Shot",
      "Shot Power",
      "Positioning",
      "Volley",
      "Penalties",
    ],
    icon: "●",
  },
  {
    name: "PASSING",
    stats: [
      "Short Passing",
      "Long Passing",
      "Vision",
      "Crossing",
      "Curve",
      "Free Kick",
    ],
    icon: "◆",
  },
  {
    name: "DRIBBLING",
    stats: ["Dribbling", "Balance", "Agility", "Reactions", "Ball Control"],
    icon: "✦",
  },
  {
    name: "DEFENDING",
    stats: [
      "Marking",
      "Standing Tackle",
      "Sliding Tackle",
      "Awareness",
      "Heading",
      "Interceptions",
    ],
    icon: "⬟",
  },
  {
    name: "PHYSICAL",
    stats: ["Strength", "Aggression", "Jumping", "Stamina"],
    icon: "◆",
  },
];

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function valueOrDash(value) {
  return typeof value === "number" ? String(value) : "—";
}

function safeFileName(value) {
  return value
    .toLocaleLowerCase()
    .replaceAll(/[^a-z0-9]+/g, "-")
    .replaceAll(/(^-|-$)/g, "");
}

function mimeType(filePath) {
  const extension = extname(filePath).toLocaleLowerCase();
  if (extension === ".jpg" || extension === ".jpeg") return "image/jpeg";
  if (extension === ".webp") return "image/webp";
  return "image/png";
}

async function readCardImage(player, assetsRoot) {
  if (!player.cardImage) return null;

  const root = resolve(assetsRoot);
  const imagePath = resolve(root, player.cardImage);
  if (imagePath !== root && !imagePath.startsWith(`${root}${sep}`)) {
    throw new Error(`Card image for ${player.name} must stay inside the bot folder.`);
  }

  const image = await readFile(imagePath);
  return `data:${mimeType(imagePath)};base64,${image.toString("base64")}`;
}

function brandMarkup(x, y, scale = 1) {
  return `
    <text x="${x}" y="${y}" font-size="${22 * scale}" font-weight="700"
      letter-spacing="${4 * scale}" fill="${COLORS.muted}">FC MOBILE COMMUNITY</text>
    <text x="${x}" y="${y + 32 * scale}" font-size="${32 * scale}" font-weight="900"
      letter-spacing="${3 * scale}" fill="${COLORS.green}">BOT</text>
  `;
}

function cardArtMarkup(player, imageData, x, y, width, height, idSuffix) {
  const clipId = `card-art-${safeFileName(player.name)}-${idSuffix}`;
  if (imageData) {
    return `
      <clipPath id="${clipId}">
        <rect x="${x}" y="${y}" width="${width}" height="${height}" rx="18" />
      </clipPath>
      <image href="${imageData}" x="${x}" y="${y}" width="${width}" height="${height}"
        preserveAspectRatio="xMidYMid slice" clip-path="url(#${clipId})" />
      <rect x="${x}" y="${y}" width="${width}" height="${height}" rx="18"
        fill="none" stroke="${COLORS.borderBright}" stroke-width="3" />
    `;
  }

  const centerX = x + width / 2;
  return `
    <defs>
      <linearGradient id="placeholder-${idSuffix}" x1="0" x2="1" y1="0" y2="1">
        <stop offset="0" stop-color="#104c3a" />
        <stop offset="0.5" stop-color="#08201d" />
        <stop offset="1" stop-color="#163e57" />
      </linearGradient>
    </defs>
    <rect x="${x}" y="${y}" width="${width}" height="${height}" rx="18"
      fill="url(#placeholder-${idSuffix})" stroke="${COLORS.borderBright}" stroke-width="3" />
    <path d="M ${x + 20} ${y + height - 35} L ${centerX} ${y + 90} L ${x + width - 20} ${y + height - 35}"
      fill="none" stroke="${COLORS.green}" stroke-width="3" opacity="0.65" />
    <circle cx="${centerX}" cy="${y + height * 0.36}" r="${Math.min(width, height) * 0.18}"
      fill="#0c2925" stroke="${COLORS.cyan}" stroke-width="3" />
    <text x="${centerX}" y="${y + height * 0.41}" text-anchor="middle" font-size="${Math.min(width, height) * 0.2}"
      font-weight="900" fill="${COLORS.text}">${escapeXml(player.name.slice(0, 1).toUpperCase())}</text>
    <text x="${centerX}" y="${y + height * 0.68}" text-anchor="middle" font-size="${Math.min(width, height) * 0.1}"
      font-weight="900" fill="${COLORS.text}">${player.ovr}</text>
    <text x="${centerX}" y="${y + height * 0.77}" text-anchor="middle" font-size="${Math.min(width, height) * 0.07}"
      font-weight="800" fill="${COLORS.green}">${escapeXml(player.position)}</text>
    <text x="${centerX}" y="${y + height - 24}" text-anchor="middle" font-size="${Math.min(width, height) * 0.05}"
      fill="${COLORS.muted}">ADD CARD IMAGE</text>
  `;
}

function coreStatMarkup(player, x, y, boxWidth, gap = 10, height = 84) {
  return primaryStats
    .map((statName, index) => {
      const left = x + index * (boxWidth + gap);
      return `
        <rect x="${left}" y="${y}" width="${boxWidth}" height="${height}" rx="8"
          fill="${COLORS.panelAlt}" stroke="${COLORS.border}" stroke-width="2" />
        <text x="${left + boxWidth / 2}" y="${y + 31}" text-anchor="middle"
          font-size="${Math.min(28, boxWidth / 4.8)}" font-weight="900" fill="${COLORS.text}">
          ${statName.slice(0, 3).toUpperCase()}
        </text>
        <text x="${left + boxWidth / 2}" y="${y + height - 18}" text-anchor="middle"
          font-size="${Math.min(34, boxWidth / 4)}" font-weight="900" fill="${COLORS.green}">
          ${valueOrDash(player.stats[statName])}
        </text>
      `;
    })
    .join("");
}

function groupStats(player, statNames) {
  const available = new Set(statNames);
  const used = new Set(primaryStats);
  const groups = [];

  for (const group of statGroups) {
    const stats = group.stats.filter(
      (statName) => available.has(statName) && player.stats[statName] !== undefined,
    );
    if (stats.length) {
      stats.forEach((statName) => used.add(statName));
      groups.push({ ...group, stats });
    }
  }

  const otherStats = statNames.filter(
    (statName) => !used.has(statName) && player.stats[statName] !== undefined,
  );
  if (otherStats.length) {
    groups.push({ name: "OTHER", stats: otherStats, icon: "◆" });
  }
  return groups;
}

function statGroupMarkup(player, group, x, y, width, compact = false) {
  const rowHeight = compact ? 27 : 31;
  const titleHeight = compact ? 34 : 40;
  const height = titleHeight + group.stats.length * rowHeight + 12;
  const rows = group.stats
    .map((statName, index) => {
      const rowY = y + titleHeight + index * rowHeight;
      return `
        <text x="${x + 14}" y="${rowY + rowHeight - 9}" font-size="${compact ? 16 : 18}"
          fill="${COLORS.text}">${escapeXml(statName)}</text>
        <rect x="${x + width - 72}" y="${rowY + 2}" width="58" height="${rowHeight - 6}" rx="5"
          fill="${COLORS.green}" />
        <text x="${x + width - 43}" y="${rowY + rowHeight - 9}" text-anchor="middle"
          font-size="${compact ? 17 : 19}" font-weight="900" fill="#07150f">
          ${valueOrDash(player.stats[statName])}
        </text>
      `;
    })
    .join("");

  return {
    height,
    markup: `
      <rect x="${x}" y="${y}" width="${width}" height="${height}" rx="10"
        fill="${COLORS.panel}" stroke="${COLORS.border}" stroke-width="2" />
      <text x="${x + 14}" y="${y + 27}" font-size="${compact ? 18 : 21}"
        font-weight="900" fill="${COLORS.green}">${group.icon} ${group.name}</text>
      ${rows}
    `,
  };
}

function arrangeGroups(groups, x, y, columnWidth, gap, maxColumns = 3) {
  const markup = [];
  const heights = [];
  let column = 0;
  let rowY = y;
  let rowHeight = 0;

  for (const group of groups) {
    const rendered = statGroupMarkup(group.player, group, x + column * (columnWidth + gap), rowY, columnWidth);
    markup.push(rendered.markup);
    rowHeight = Math.max(rowHeight, rendered.height);
    heights.push(rendered.height);
    column += 1;
    if (column === maxColumns) {
      column = 0;
      rowY += rowHeight + gap;
      rowHeight = 0;
    }
  }

  return { markup: markup.join(""), height: rowY + rowHeight - y };
}

function playerInfoMarkup(player, x, y, width) {
  const info = [
    player.heightCm ? `Height ${player.heightCm} cm` : null,
    player.weightKg ? `Weight ${player.weightKg} kg` : null,
    player.workrate ? `Workrate ${player.workrate}` : null,
    player.altPositions ? `Alt positions ${player.altPositions}` : null,
  ].filter(Boolean);
  if (!info.length) info.push("Add optional player info to players.json");

  return `
    <rect x="${x}" y="${y}" width="${width}" height="${Math.max(86, info.length * 27 + 28)}"
      rx="10" fill="${COLORS.panel}" stroke="${COLORS.border}" stroke-width="2" />
    <text x="${x + 14}" y="${y + 27}" font-size="20" font-weight="900" fill="${COLORS.cyan}">ⓘ INFO</text>
    ${info.map((line, index) => `<text x="${x + 14}" y="${y + 54 + index * 27}" font-size="17" fill="${COLORS.text}">${escapeXml(line)}</text>`).join("")}
  `;
}

export async function renderPlayerCard(player, statNames, assetsRoot) {
  const imageData = await readCardImage(player, assetsRoot);
  const groups = groupStats(player, statNames).map((group) => ({ ...group, player }));
  const groupColumns = Math.min(3, Math.max(1, groups.length));
  const columnWidth = 292;
  const groupGap = 12;
  const groupAreaHeight = groups.length
    ? Math.ceil(groups.length / groupColumns) * 220
    : 100;
  const height = Math.max(850, 805 + groupAreaHeight);
  const groupMarkup = [];
  for (let index = 0; index < groups.length; index += 1) {
    const group = groups[index];
    const column = index % groupColumns;
    const row = Math.floor(index / groupColumns);
    const groupY = 805 + row * 220;
    groupMarkup.push(
      statGroupMarkup(
        player,
        group,
        430 + column * (columnWidth + groupGap),
        groupY,
        columnWidth,
      ).markup,
    );
  }

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="1450" height="${height}" viewBox="0 0 1450 ${height}">
      <defs>
        <linearGradient id="player-bg" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stop-color="#07100f" />
          <stop offset="0.5" stop-color="${COLORS.background}" />
          <stop offset="1" stop-color="${COLORS.backgroundGlow}" />
        </linearGradient>
      </defs>
      <rect width="1450" height="${height}" fill="url(#player-bg)" />
      <rect x="12" y="12" width="1426" height="${height - 24}" rx="20" fill="none"
        stroke="${COLORS.borderBright}" stroke-width="4" />
      <text x="50" y="58" font-size="34" font-weight="900" letter-spacing="1"
        fill="${COLORS.text}">${escapeXml(player.name)} — RANK 0 (LEVEL 0) STATS</text>
      ${brandMarkup(1140, 40, 0.72)}
      <rect x="30" y="88" width="370" height="${height - 122}" rx="14" fill="${COLORS.panel}"
        stroke="${COLORS.border}" stroke-width="2" />
      ${cardArtMarkup(player, imageData, 65, 125, 300, 390, "player")}
      <text x="215" y="560" text-anchor="middle" font-size="28" font-weight="900"
        fill="${COLORS.text}">${escapeXml(player.name)}</text>
      <text x="215" y="596" text-anchor="middle" font-size="24" font-weight="800"
        fill="${COLORS.green}">OVR ${player.ovr} · ${escapeXml(player.position)}</text>
      ${playerInfoMarkup(player, 55, 630, 320)}
      <rect x="55" y="${height - 103}" width="320" height="58" rx="13"
        fill="${COLORS.panelAlt}" stroke="${COLORS.cyan}" stroke-width="2" />
      <text x="215" y="${height - 67}" text-anchor="middle" font-size="25"
        font-weight="900" fill="${COLORS.text}">◉ ${player.shardCost ?? "—"} SHARDS</text>
      <rect x="415" y="88" width="1005" height="${height - 122}" rx="14" fill="${COLORS.panel}"
        stroke="${COLORS.border}" stroke-width="2" />
      ${coreStatMarkup(player, 430, 120, 150, 10, 92)}
      <line x1="430" y1="245" x2="1405" y2="245" stroke="${COLORS.border}" stroke-width="2" />
      <text x="430" y="282" font-size="24" font-weight="900" fill="${COLORS.muted}">AVAILABLE STATISTICS</text>
      ${groupMarkup.join("")}
      <text x="720" y="${height - 30}" text-anchor="middle" font-size="18" letter-spacing="5"
        fill="${COLORS.green}">FC MOBILE COMMUNITY BOT</text>
    </svg>
  `;

  return {
    buffer: await sharp(Buffer.from(svg)).png().toBuffer(),
    fileName: `${safeFileName(player.name)}-stats.png`,
  };
}

function compareValueColor(leftValue, rightValue, side) {
  if (leftValue === undefined || rightValue === undefined) return COLORS.muted;
  if (leftValue === rightValue) return COLORS.text;
  if (side === "left") return leftValue > rightValue ? COLORS.green : COLORS.red;
  return rightValue > leftValue ? COLORS.green : COLORS.red;
}

function compareRowMarkup(left, right, statName, x, y, width) {
  const leftValue = left.stats[statName];
  const rightValue = right.stats[statName];
  return `
    <rect x="${x}" y="${y}" width="${width}" height="38" rx="6"
      fill="${COLORS.panelAlt}" stroke="#34554d" stroke-width="1" />
    <text x="${x + 18}" y="${y + 26}" font-size="20" fill="${COLORS.text}">${escapeXml(statName)}</text>
    <text x="${x + width - 152}" y="${y + 26}" text-anchor="end" font-size="22" font-weight="900"
      fill="${compareValueColor(leftValue, rightValue, "left")}">${valueOrDash(leftValue)}</text>
    <text x="${x + width - 42}" y="${y + 26}" text-anchor="end" font-size="22" font-weight="900"
      fill="${compareValueColor(leftValue, rightValue, "right")}">${valueOrDash(rightValue)}</text>
  `;
}

export async function renderComparisonCard(left, right, statNames, assetsRoot) {
  const [leftImage, rightImage] = await Promise.all([
    readCardImage(left, assetsRoot),
    readCardImage(right, assetsRoot),
  ]);
  const details = statNames.filter((statName) => !primaryStats.includes(statName));
  const height = Math.max(1060, 700 + Math.ceil(details.length / 2) * 44);
  const leftRows = details
    .filter((_, index) => index % 2 === 0)
    .map((statName, index) => compareRowMarkup(left, right, statName, 65, 760 + index * 44, 715))
    .join("");
  const rightRows = details
    .filter((_, index) => index % 2 === 1)
    .map((statName, index) => compareRowMarkup(left, right, statName, 820, 760 + index * 44, 715))
    .join("");

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="1600" height="${height}" viewBox="0 0 1600 ${height}">
      <defs>
        <linearGradient id="compare-bg" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stop-color="#07100f" />
          <stop offset="0.5" stop-color="${COLORS.background}" />
          <stop offset="1" stop-color="${COLORS.backgroundGlow}" />
        </linearGradient>
      </defs>
      <rect width="1600" height="${height}" fill="url(#compare-bg)" />
      <rect x="12" y="12" width="1576" height="${height - 24}" rx="20" fill="none"
        stroke="${COLORS.borderBright}" stroke-width="4" />
      <text x="800" y="62" text-anchor="middle" font-size="40" font-weight="900"
        fill="${COLORS.text}">${escapeXml(left.name)} VS ${escapeXml(right.name)} COMPARISON</text>
      ${brandMarkup(1300, 36, 0.55)}
      <rect x="35" y="95" width="1530" height="570" rx="14" fill="${COLORS.panel}"
        stroke="${COLORS.border}" stroke-width="2" />
      ${cardArtMarkup(left, leftImage, 80, 130, 280, 390, "left")}
      ${cardArtMarkup(right, rightImage, 1240, 130, 280, 390, "right")}
      <text x="445" y="175" text-anchor="middle" font-size="30" font-weight="900"
        fill="${COLORS.text}">${escapeXml(left.name)}</text>
      <text x="1155" y="175" text-anchor="middle" font-size="30" font-weight="900"
        fill="${COLORS.text}">${escapeXml(right.name)}</text>
      <text x="445" y="214" text-anchor="middle" font-size="24" fill="${COLORS.green}">OVR ${left.ovr} · ${escapeXml(left.position)}</text>
      <text x="1155" y="214" text-anchor="middle" font-size="24" fill="${COLORS.green}">OVR ${right.ovr} · ${escapeXml(right.position)}</text>
      <rect x="375" y="250" width="590" height="66" rx="10" fill="${COLORS.panelAlt}" stroke="${COLORS.border}" />
      <rect x="635" y="250" width="330" height="66" rx="10" fill="${COLORS.panelAlt}" stroke="${COLORS.cyan}" />
      <rect x="375" y="334" width="590" height="66" rx="10" fill="${COLORS.panelAlt}" stroke="${COLORS.border}" />
      <rect x="635" y="334" width="330" height="66" rx="10" fill="${COLORS.panelAlt}" stroke="${COLORS.cyan}" />
      <text x="665" y="293" font-size="22" fill="${COLORS.muted}">Height / weight</text>
      <text x="935" y="293" text-anchor="end" font-size="22" fill="${COLORS.text}">${escapeXml(`${left.heightCm ?? "—"} cm / ${left.weightKg ?? "—"} kg`)}</text>
      <text x="665" y="377" font-size="22" fill="${COLORS.muted}">Shard cost</text>
      <text x="935" y="377" text-anchor="end" font-size="24" font-weight="900" fill="${COLORS.cyan}">${left.shardCost ?? "—"} | ${right.shardCost ?? "—"}</text>
      ${coreStatMarkup(left, 395, 440, 83, 7, 78)}
      ${coreStatMarkup(right, 1035, 440, 83, 7, 78)}
      <text x="800" y="480" text-anchor="middle" font-size="22" font-weight="900" fill="${COLORS.muted}">LEFT | RIGHT</text>
      <line x1="55" y1="690" x2="1545" y2="690" stroke="${COLORS.border}" stroke-width="2" />
      <text x="800" y="730" text-anchor="middle" font-size="23" font-weight="900" fill="${COLORS.muted}">DETAILED STAT COMPARISON</text>
      ${leftRows}
      ${rightRows}
      <text x="800" y="${height - 30}" text-anchor="middle" font-size="18" letter-spacing="4"
        fill="${COLORS.green}">GREEN = HIGHER · RED = LOWER · WHITE = TIE</text>
    </svg>
  `;

  return {
    buffer: await sharp(Buffer.from(svg)).png().toBuffer(),
    fileName: `${safeFileName(left.name)}-vs-${safeFileName(right.name)}.png`,
  };
}

export async function renderTop10Card(players, position, assetsRoot) {
  const title = position ? `TOP 10 ${position.toUpperCase()}S` : "TOP 10 CARDS";
  const height = Math.max(700, 235 + Math.ceil(players.length / 2) * 142);
  const cards = await Promise.all(
    players.map(async (player) => ({
      player,
      imageData: await readCardImage(player, assetsRoot),
    })),
  );
  const rows = cards
    .map(({ player, imageData }, index) => {
      const column = index % 2;
      const row = Math.floor(index / 2);
      const x = 75 + column * 720;
      const y = 210 + row * 142;
      return `
        <rect x="${x}" y="${y}" width="650" height="118" rx="12" fill="${COLORS.panel}"
          stroke="${index < 3 ? COLORS.gold : COLORS.border}" stroke-width="2" />
        ${cardArtMarkup(player, imageData, x + 14, y + 12, 95, 94, `top-${index}`)}
        <text x="${x + 132}" y="${y + 39}" font-size="25" font-weight="900" fill="${COLORS.gold}">#${String(index + 1).padStart(2, "0")}</text>
        <text x="${x + 225}" y="${y + 39}" font-size="24" font-weight="800" fill="${COLORS.text}">${escapeXml(player.name)}</text>
        <text x="${x + 225}" y="${y + 72}" font-size="20" fill="${COLORS.muted}">${escapeXml(player.position)}</text>
        <text x="${x + 585}" y="${y + 42}" text-anchor="end" font-size="26" font-weight="900" fill="${COLORS.green}">${player.ovr}</text>
        <text x="${x + 585}" y="${y + 78}" text-anchor="end" font-size="17" fill="${COLORS.cyan}">${player.shardCost ?? "—"} shards</text>
      `;
    })
    .join("");

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="1500" height="${height}" viewBox="0 0 1500 ${height}">
      <defs>
        <linearGradient id="top-bg" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stop-color="#07100f" />
          <stop offset="0.5" stop-color="${COLORS.background}" />
          <stop offset="1" stop-color="${COLORS.backgroundGlow}" />
        </linearGradient>
      </defs>
      <rect width="1500" height="${height}" fill="url(#top-bg)" />
      <rect x="12" y="12" width="1476" height="${height - 24}" rx="20" fill="none"
        stroke="${COLORS.borderBright}" stroke-width="4" />
      <text x="750" y="75" text-anchor="middle" font-size="54" font-weight="900" fill="${COLORS.text}">${title}</text>
      <text x="750" y="125" text-anchor="middle" font-size="25" fill="${COLORS.green}">BASED ON OVR · SHARD COST INCLUDED</text>
      ${brandMarkup(1250, 45, 0.55)}
      ${rows || `<text x="750" y="280" text-anchor="middle" font-size="30" fill="${COLORS.muted}">No cards found.</text>`}
      <text x="750" y="${height - 32}" text-anchor="middle" font-size="18" letter-spacing="5"
        fill="${COLORS.green}">FC MOBILE COMMUNITY BOT</text>
    </svg>
  `;

  return {
    buffer: await sharp(Buffer.from(svg)).png().toBuffer(),
    fileName: `top10${position ? `-${safeFileName(position)}` : ""}.png`,
  };
}

export async function renderSearchCard(searchTerm, matches, assetsRoot) {
  const cards = await Promise.all(
    matches.slice(0, 15).map(async (player) => ({
      player,
      imageData: await readCardImage(player, assetsRoot),
    })),
  );
  const height = Math.max(500, 235 + Math.ceil(cards.length / 2) * 125);
  const rows = cards
    .map(({ player, imageData }, index) => {
      const column = index % 2;
      const row = Math.floor(index / 2);
      const x = 75 + column * 720;
      const y = 205 + row * 125;
      return `
        <rect x="${x}" y="${y}" width="650" height="102" rx="12" fill="${COLORS.panel}"
          stroke="${COLORS.border}" stroke-width="2" />
        ${cardArtMarkup(player, imageData, x + 12, y + 10, 78, 82, `search-${index}`)}
        <text x="${x + 112}" y="${y + 42}" font-size="24" font-weight="800" fill="${COLORS.text}">${escapeXml(player.name)}</text>
        <text x="${x + 112}" y="${y + 75}" font-size="20" fill="${COLORS.muted}">${escapeXml(player.position)}</text>
        <text x="${x + 590}" y="${y + 48}" text-anchor="end" font-size="26" font-weight="900" fill="${COLORS.green}">OVR ${player.ovr}</text>
      `;
    })
    .join("");
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="1500" height="${height}" viewBox="0 0 1500 ${height}">
      <rect width="1500" height="${height}" fill="${COLORS.background}" />
      <rect x="12" y="12" width="1476" height="${height - 24}" rx="20" fill="none"
        stroke="${COLORS.borderBright}" stroke-width="4" />
      <text x="750" y="75" text-anchor="middle" font-size="46" font-weight="900" fill="${COLORS.text}">PLAYER SEARCH</text>
      <text x="750" y="125" text-anchor="middle" font-size="27" fill="${COLORS.green}">MATCHING “${escapeXml(searchTerm)}”</text>
      ${brandMarkup(1250, 45, 0.55)}
      ${rows || `<text x="750" y="280" text-anchor="middle" font-size="30" fill="${COLORS.muted}">No matching cards.</text>`}
    </svg>
  `;
  return {
    buffer: await sharp(Buffer.from(svg)).png().toBuffer(),
    fileName: `search-${safeFileName(searchTerm)}.png`,
  };
}