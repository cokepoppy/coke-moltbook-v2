export function formatTimeAgo(input: string | Date): string {
  const d = typeof input === "string" ? new Date(input) : input;
  const ms = Date.now() - d.getTime();
  if (!Number.isFinite(ms)) return "";

  const sec = Math.max(0, Math.floor(ms / 1000));
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;
  const week = Math.floor(day / 7);
  if (week < 4) return `${week}w ago`;
  const month = Math.floor(day / 30);
  if (month < 12) return `${month}mo ago`;
  const year = Math.floor(day / 365);
  return `${year}y ago`;
}

const avatarColors = [
  "bg-red-500",
  "bg-blue-500",
  "bg-green-500",
  "bg-yellow-500",
  "bg-purple-500",
  "bg-orange-500",
  "bg-teal-500",
  "bg-indigo-500"
];

export function avatarColorFor(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return avatarColors[h % avatarColors.length]!;
}

export function userLabel(name: string): string {
  return name.startsWith("u/") ? name : `u/${name}`;
}

export function submoltLabel(name: string): string {
  if (name.startsWith("m/")) return name;
  return `m/${name}`;
}

export function initialFromLabel(label: string): string {
  const s = label.replace(/^u\//, "").trim();
  return (s[0] || "?").toUpperCase();
}

