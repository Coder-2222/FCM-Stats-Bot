import { readFile } from "node:fs/promises";

const primaryStats = [
  "Pace",
  "Shooting",
  "Passing",
  "Dribbling",
  "Defending",
  "Physical",
];

function normalize(value) {
  return value.trim().toLocaleLowerCase();
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function validatePlayer(player, index) {
  if (
    !isRecord(player) ||
    typeof player.name !== "string" ||
    typeof player.position !== "string" ||
    typeof player.ovr !== "number" ||
    !isRecord(player.stats)
  ) {
    throw new Error(
      `Invalid player at index ${index}. Each player needs name, position, ovr, and stats.`,
    );
  }

  const invalidStat = Object.entries(player.stats).find(
    ([, value]) => typeof value !== "number",
  );
  if (invalidStat) {
    throw new Error(
      `Invalid stat "${invalidStat[0]}" for ${player.name}. Stat values must be numbers.`,
    );
  }

  return {
    name: player.name.trim(),
    position: player.position.trim().toUpperCase(),
    ovr: player.ovr,
    stats: player.stats,
  };
}

export class PlayerStore {
  constructor(filePath) {
    this.filePath = filePath;
    this.players = [];
  }

  async load() {
    const fileContents = await readFile(this.filePath, "utf8");
    const parsed = JSON.parse(fileContents);
    if (!Array.isArray(parsed)) {
      throw new Error("players.json must contain an array of players.");
    }

    this.players = parsed.map(validatePlayer);
    return this.players;
  }

  getAll() {
    return this.players;
  }

  findMatches(searchTerm) {
    const query = normalize(searchTerm);
    if (!query) return [];

    return this.players.filter((player) =>
      normalize(player.name).includes(query),
    );
  }

  findBest(searchTerm) {
    const query = normalize(searchTerm);
    return (
      this.players.find((player) => normalize(player.name) === query) ??
      this.findMatches(searchTerm)[0]
    );
  }

  getTop10(position) {
    const normalizedPosition = position?.trim().toUpperCase();
    return [...this.players]
      .filter(
        (player) =>
          !normalizedPosition || player.position === normalizedPosition,
      )
      .sort((a, b) => b.ovr - a.ovr || a.name.localeCompare(b.name))
      .slice(0, 10);
  }

  getAllStatNames(players = this.players) {
    const names = new Set();
    for (const player of players) {
      for (const statName of Object.keys(player.stats)) {
        names.add(statName);
      }
    }
    return [...names];
  }
}

export { primaryStats };