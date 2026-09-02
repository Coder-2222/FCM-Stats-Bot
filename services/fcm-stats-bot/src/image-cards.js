import { readFile } from "node:fs/promises";
import { resolve, sep } from "node:path";
import sharp from "sharp";
import { primaryStats } from "./player-store.js";

const COLORS = {
  background: "#101321",
  panel: "#171b2c",
  panelAlt: "#1f2438",
  border: "#49e7d1",
  borderAlt: "#c477ff",
  text: "#f5f7ff",
  muted: "#aeb7d2",
  green: "#72df45",
  red: "#ff646e",
  cyan: "#30e7ff",
};

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

async function readCardImage(player, assetsRoot) {
  if (!player.cardImage) return null;

  const root = resolve(assetsRoot);
  const imagePath = resolve(root, player.cardImage);
  if (imagePath !== root && !imagePath.startsWith(`${root}${sep}`)) {
    throw new Error(`Card image for ${player.name} must stay inside the bot folder.`);
  }

  const image = await readFile(imagePath);
  const mime = player.cardImage.toLocaleLowerCase().endsWith(".jpg")
    || player.cardImage.toLocaleLowerCase().endsWith(".jpeg")
    ? "image/jpeg"
    : "image/png";
  return `data:${mime};base64,${image.toString("base64")}`;
}

function cardArtMarkup(player, imageData, x, y, width, height) {
  if (imageData) {
    return `
      <clipPath id="card-art-${safeFileName(player.name)}">
        <rect x="${x}" y="${y}" width="${width}" height="${height}" rx="24" />
      </clipPath>
      <image href="${imageData}" x="${x}" y="${y}" width="${width}" height="${height}"
        preserveAspectRatio="xMidYMid slice" clip-path="url(#card-art-${safeFileName(player.name)})" />
    `;
  }

  return `
    <rect x="${x}" y="${y}" width="${width}" height="${height}" rx="24"
      fill="url(#card-placeholder)" stroke="${COLORS.borderAlt}" stroke-width="3" />
    <circle cx="${x + width / 2}" cy="${y + 155}" r="92" fill="#2b3150" stroke="${COLORS.cyan}" stroke-width="4" />
    <text x="${x + width / 2}" y="${y + 180}" text-anchor="middle" font-size="102"
      font-weight="800" fill="${COLORS.text}">${escapeXml(player.name.slice(0, 1).toUpperCase())}</text>
    <text x="${x + width / 2}" y="${y + 295}" text-anchor="middle" font-size="34"
      font-weight="700" fill="${COLORS.text}">CARD ART</text>
    <text x="${x + width / 2}" y="${y + 344}" text-anchor="middle" font-size="25"
      fill="${COLORS.muted}">Add cardImage to players.json</text>
    <text x="${x + width / 2}" y="${y + 430}" text-anchor="middle" font-size="88"
      font-weight="800" fill="${COLORS.green}">${player.ovr}</text>
    <text x="${x + width / 2}" y="${y + 478}" text-anchor="middle" font-size="32"
      font-weight="700" fill="${COLORS.text}">${escapeXml(player.position)}</text>
  `;
}

function coreStatMarkup(player, x, y, boxWidth = 148) {
  return primaryStats
    .map((statName, index) => {
      const left = x + index * (boxWidth + 12);
      return `
        <rect x="${left}" y="${y}" width="${boxWidth}" height="116" rx="10"
          fill="${COLORS.panelAlt}" stroke="${COLORS.borderAlt}" stroke-width="2" />
        <text x="${left + boxWidth / 2}" y="${y + 45}" text-anchor="middle"
          font-size="31" font-weight="800" fill="${COLORS.text}">${statName.slice(0, 3).toUpperCase()}</text>
        <text x="${left + boxWidth / 2}" y="${y + 91}" text-anchor="middle"
          font-size="44" font-weight="800" fill="${COLORS.green}">${valueOrDash(player.stats[statName])}</text>
      `;
    })
    .join("");
}

function statRowsMarkup(player, statNames, x, y, width, rowHeight = 48) {
  const rows = statNames.filter((statName) => !primaryStats.includes(statName));
  const rowWidth = width - 18;
  return rows
    .map((statName, index) => {
      const rowY = y + index * rowHeight;
      const value = valueOrDash(player.stats[statName]);
      return `
        <rect x="${x}" y="${rowY}" width="${rowWidth}" height="${rowHeight - 8}" rx="8"
          fill="${COLORS.panelAlt}" stroke="#51607e" stroke-width="1.5" />
        <text x="${x + 17}" y="${rowY + 29}" font-size="22" font-weight="650"
          fill="${COLORS.text}">${escapeXml(statName)}</text>
        <rect x="${x + rowWidth - 92}" y="${rowY}" width="92" height="${rowHeight - 8}" rx="8"
          fill="${COLORS.green}" />
        <text x="${x + rowWidth - 46}" y="${rowY + 29}" text-anchor="middle"
          font-size="24" font-weight="800" fill="#09140e">${value}</text>
      `;
    })
    .join("");
}

function shardBadge(player, x, y) {
  const cost = player.shardCost === null ? "—" : player.shardCost.toLocaleString();
  return `
    <rect x="${x}" y="${y}" width="280" height="66" rx="18" fill="${COLORS.panelAlt}"
      stroke="${COLORS.cyan}" stroke-width="2" />
    <circle cx="${x + 32}" cy="${y + 33}" r="17" fill="${COLORS.cyan}" />
    <text x="${x + 32}" y="${y + 42}" text-anchor="middle" font-size="21"
      font-weight="900" fill="#09140e">S</text>
    <text x="${x + 65}" y="${y + 42}" font-size="30" font-weight="800"
      fill="${COLORS.text}">${escapeXml(cost)} shards</text>
  `;
}

export async function renderPlayerCard(player, statNames, assetsRoot) {
  const imageData = await readCardImage(player, assetsRoot);
  const detailStats = statNames.filter((statName) => !primaryStats.includes(statName));
  const rowsPerColumn = Math.ceil(detailStats.length / 2);
  const height = Math.max(920, 530 + rowsPerColumn * 52 + 125);
  const half = Math.ceil(detailStats.length / 2);
  const leftStats = detailStats.slice(0, half);
  const rightStats = detailStats.slice(half);
  const leftRows = statRowsMarkup(player, leftStats, 500, 430, 425);
  const rightRows = statRowsMarkup(player, rightStats, 950, 430, 425);

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="1450" height="${height}" viewBox="0 0 1450 ${height}">
      <defs>
        <linearGradient id="background" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stop-color="#111a35" />
          <stop offset="0.5" stop-color="#111321" />
          <stop offset="1" stop-color="#082c38" />
        </linearGradient>
        <linearGradient id="card-placeholder" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stop-color="#172e55" />
          <stop offset="0.5" stop-color="#2f1c4c" />
          <stop offset="1" stop-color="#123d45" />
        </linearGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="8" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      <rect width="1450" height="${height}" fill="url(#background)" />
      <rect x="16" y="16" width="1418" height="${height - 32}" rx="24"
        fill="none" stroke="${COLORS.border}" stroke-width="5" filter="url(#glow)" />
      <text x="725" y="68" text-anchor="middle" font-family="Arial, sans-serif"
        font-size="42" font-weight="800" fill="${COLORS.text}">
        ${escapeXml(player.name)} — Rank 5 (Level 30) Stats
      </text>
      <rect x="46" y="110" width="390" height="${height - 160}" rx="20" fill="${COLORS.panel}"
        stroke="${COLORS.borderAlt}" stroke-width="2" />
      ${cardArtMarkup(player, imageData, 76, 150, 330, 440)}
      <text x="241" y="635" text-anchor="middle" font-family="Arial, sans-serif"
        font-size="38" font-weight="800" fill="${COLORS.text}">${escapeXml(player.name)}</text>
      <text x="241" y="682" text-anchor="middle" font-size="30" font-weight="700"
        fill="${COLORS.muted}">OVR ${player.ovr} · ${escapeXml(player.position)}</text>
      <rect x="86" y="730" width="310" height="64" rx="14" fill="${COLORS.panelAlt}"
        stroke="#51607e" stroke-width="2" />
      <text x="241" y="771" text-anchor="middle" font-size="26" font-weight="700"
        fill="${COLORS.text}">FCM Stats Bot</text>
      ${shardBadge(player, 101, 820)}
      <rect x="470" y="110" width="930" height="${height - 160}" rx="20" fill="${COLORS.panel}"
        stroke="${COLORS.border}" stroke-width="2" />
      ${coreStatMarkup(player, 500, 150)}
      <text x="500" y="320" font-size="28" font-weight="800" fill="${COLORS.muted}">Detailed attributes</text>
      ${leftRows}
      ${rightRows}
    </svg>
  `;

  return {
    buffer: await sharp(Buffer.from(svg)).png().toBuffer(),
    fileName: `${safeFileName(player.name)}-stats.png`,
  };
}

function compareColor(left, right, side) {
  if (left === undefined || right === undefined) return COLORS.muted;
  if (left === right) return COLORS.text;
  if (side === "left") return left > right ? COLORS.green : COLORS.red;
  return right > left ? COLORS.green : COLORS.red;
}

function compareRowsMarkup(left, right, statNames, x, y, width) {
  return statNames
    .map((statName, index) => {
      const rowY = y + index * 42;
      const leftValue = left.stats[statName];
      const rightValue = right.stats[statName];
      return `
        <rect x="${x}" y="${rowY}" width="${width}" height="34" rx="7"
          fill="${COLORS.panelAlt}" stroke="#51607e" stroke-width="1" />
        <text x="${x + 14}" y="${rowY + 23}" font-size="19" fill="${COLORS.text}">${escapeXml(statName)}</text>
        <text x="${x + width - 155}" y="${rowY + 23}" text-anchor="end" font-size="21"
          font-weight="800" fill="${compareColor(leftValue, rightValue, "left")}">${valueOrDash(leftValue)}</text>
        <text x="${x + width - 72}" y="${rowY + 23}" text-anchor="end" font-size="21"
          font-weight="800" fill="${compareColor(leftValue, rightValue, "right")}">${valueOrDash(rightValue)}</text>
      `;
    })
    .join("");
}

export async function renderComparisonCard(left, right, statNames, assetsRoot) {
  const [leftImage, rightImage] = await Promise.all([
    readCardImage(left, assetsRoot),
    readCardImage(right, assetsRoot),
  ]);
  const details = statNames.filter((statName) => !primaryStats.includes(statName));
  const rowsPerColumn = Math.ceil(details.length / 2);
  const height = Math.max(980, 590 + rowsPerColumn * 42 + 120);
  const half = Math.ceil(details.length / 2);
  const leftStats = details.slice(0, half);
  const rightStats = details.slice(half);
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="1800" height="${height}" viewBox="0 0 1800 ${height}">
      <defs>
        <linearGradient id="comparison-background" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stop-color="#111a35" />
          <stop offset="0.5" stop-color="#111321" />
          <stop offset="1" stop-color="#082c38" />
        </linearGradient>
      </defs>
      <rect width="1800" height="${height}" fill="url(#comparison-background)" />
      <rect x="16" y="16" width="1768" height="${height - 32}" rx="24"
        fill="none" stroke="${COLORS.border}" stroke-width="5" />
      <text x="900" y="70" text-anchor="middle" font-size="44" font-weight="800"
        fill="${COLORS.text}">${escapeXml(left.name)} vs ${escapeXml(right.name)} Comparison</text>
      <rect x="40" y="110" width="830" height="${height - 155}" rx="20" fill="${COLORS.panel}"
        stroke="${COLORS.borderAlt}" stroke-width="2" />
      <rect x="930" y="110" width="830" height="${height - 155}" rx="20" fill="${COLORS.panel}"
        stroke="${COLORS.borderAlt}" stroke-width="2" />
      ${cardArtMarkup(left, leftImage, 90, 145, 270, 290)}
      ${cardArtMarkup(right, rightImage, 980, 145, 270, 290)}
      <text x="500" y="195" text-anchor="middle" font-size="34" font-weight="800"
        fill="${COLORS.text}">${escapeXml(left.name)}</text>
      <text x="500" y="240" text-anchor="middle" font-size="27" fill="${COLORS.muted}">OVR ${left.ovr} · ${escapeXml(left.position)}</text>
      <text x="1400" y="195" text-anchor="middle" font-size="34" font-weight="800"
        fill="${COLORS.text}">${escapeXml(right.name)}</text>
      <text x="1400" y="240" text-anchor="middle" font-size="27" fill="${COLORS.muted}">OVR ${right.ovr} · ${escapeXml(right.position)}</text>
      ${shardBadge(left, 360, 350)}
      ${shardBadge(right, 1250, 350)}
      <rect x="90" y="465" width="730" height="100" rx="14" fill="${COLORS.panelAlt}"
        stroke="${COLORS.border}" stroke-width="2" />
      <rect x="980" y="465" width="730" height="100" rx="14" fill="${COLORS.panelAlt}"
        stroke="${COLORS.border}" stroke-width="2" />
      ${coreStatMarkup(left, 106, 480, 108)}
      ${coreStatMarkup(right, 996, 480, 108)}
      <text x="90" y="615" font-size="26" font-weight="800" fill="${COLORS.muted}">Stat comparison</text>
      <text x="810" y="615" text-anchor="end" font-size="22" fill="${COLORS.muted}">LEFT | RIGHT</text>
      ${compareRowsMarkup(left, right, leftStats, 90, 640, 730)}
      ${compareRowsMarkup(left, right, rightStats, 980, 640, 730)}
      <text x="900" y="${height - 32}" text-anchor="middle" font-size="22" fill="${COLORS.muted}">
        Green = higher value · White = tie · Red = lower value
      </text>
    </svg>
  `;

  return {
    buffer: await sharp(Buffer.from(svg)).png().toBuffer(),
    fileName: `${safeFileName(left.name)}-vs-${safeFileName(right.name)}.png`,
  };
}

export async function renderTop10Card(players, position) {
  const height = Math.max(680, 240 + players.length * 68);
  const title = position ? `Top 10 ${position} Cards` : "Top 10 FC Mobile Cards";
  const rows = players
    .map(
      (player, index) => `
        <rect x="100" y="${220 + index * 68}" width="1200" height="52" rx="10"
          fill="${index % 2 === 0 ? COLORS.panelAlt : COLORS.panel}" stroke="#51607e" />
        <text x="130" y="${255 + index * 68}" font-size="26" font-weight="800" fill="${COLORS.cyan}">#${index + 1}</text>
        <text x="220" y="${255 + index * 68}" font-size="26" font-weight="700" fill="${COLORS.text}">${escapeXml(player.name)}</text>
        <text x="930" y="${255 + index * 68}" font-size="24" fill="${COLORS.muted}">${escapeXml(player.position)}</text>
        <text x="1120" y="${255 + index * 68}" font-size="28" font-weight="800" fill="${COLORS.green}">OVR ${player.ovr}</text>
        <text x="1280" y="${255 + index * 68}" text-anchor="end" font-size="22" fill="${COLORS.muted}">${player.shardCost ?? "—"} shards</text>
      `,
    )
    .join("");

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="1400" height="${height}" viewBox="0 0 1400 ${height}">
      <rect width="1400" height="${height}" fill="${COLORS.background}" />
      <rect x="16" y="16" width="1368" height="${height - 32}" rx="24" fill="none"
        stroke="${COLORS.border}" stroke-width="5" />
      <text x="700" y="92" text-anchor="middle" font-size="48" font-weight="800" fill="${COLORS.text}">${title}</text>
      <text x="700" y="140" text-anchor="middle" font-size="24" fill="${COLORS.muted}">Sorted by OVR · shard costs included</text>
      ${rows || `<text x="700" y="260" text-anchor="middle" font-size="28" fill="${COLORS.muted}">No cards found.</text>`}
    </svg>
  `;

  return {
    buffer: await sharp(Buffer.from(svg)).png().toBuffer(),
    fileName: `top10${position ? `-${safeFileName(position)}` : ""}.png`,
  };
}

export async function renderSearchCard(searchTerm, matches) {
  const height = Math.max(460, 300 + Math.min(matches.length, 15) * 54);
  const rows = matches
    .slice(0, 15)
    .map(
      (player, index) => `
        <rect x="140" y="${230 + index * 54}" width="1120" height="42" rx="8"
          fill="${index % 2 === 0 ? COLORS.panelAlt : COLORS.panel}" />
        <text x="170" y="${258 + index * 54}" font-size="23" fill="${COLORS.text}">${escapeXml(player.name)}</text>
        <text x="930" y="${258 + index * 54}" font-size="22" fill="${COLORS.muted}">${escapeXml(player.position)}</text>
        <text x="1150" y="${258 + index * 54}" text-anchor="end" font-size="24" font-weight="800" fill="${COLORS.green}">OVR ${player.ovr}</text>
      `,
    )
    .join("");
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="1400" height="${height}" viewBox="0 0 1400 ${height}">
      <rect width="1400" height="${height}" fill="${COLORS.background}" />
      <rect x="16" y="16" width="1368" height="${height - 32}" rx="24" fill="none"
        stroke="${COLORS.border}" stroke-width="5" />
      <text x="700" y="92" text-anchor="middle" font-size="44" font-weight="800" fill="${COLORS.text}">Search results</text>
      <text x="700" y="140" text-anchor="middle" font-size="27" fill="${COLORS.muted}">Matching “${escapeXml(searchTerm)}”</text>
      ${rows || `<text x="700" y="270" text-anchor="middle" font-size="28" fill="${COLORS.muted}">No matching cards.</text>`}
    </svg>
  `;
  return {
    buffer: await sharp(Buffer.from(svg)).png().toBuffer(),
    fileName: `search-${safeFileName(searchTerm)}.png`,
  };
}