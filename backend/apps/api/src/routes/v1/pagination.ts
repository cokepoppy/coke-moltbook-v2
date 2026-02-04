import { ApiError } from "../../http.js";

export type TimeCursor = {
  created_at: string;
  id: string;
};

export function encodeCursor(cursor: TimeCursor) {
  return Buffer.from(JSON.stringify(cursor)).toString("base64url");
}

export function decodeCursor(raw?: string): TimeCursor | null {
  if (!raw) return null;
  try {
    const json = Buffer.from(raw, "base64url").toString("utf8");
    const parsed = JSON.parse(json) as Partial<TimeCursor>;
    if (typeof parsed.created_at !== "string" || typeof parsed.id !== "string") return null;
    return { created_at: parsed.created_at, id: parsed.id };
  } catch {
    return null;
  }
}

export function parseLimit(raw: unknown, { min = 1, max = 50, def = 25 } = {}) {
  const n = typeof raw === "string" ? Number(raw) : typeof raw === "number" ? raw : def;
  if (!Number.isFinite(n)) return def;
  const i = Math.trunc(n);
  if (i < min) return min;
  if (i > max) return max;
  return i;
}

export function requireCursor(raw?: string) {
  const c = decodeCursor(raw);
  if (!c) throw new ApiError(400, "bad_request", "Invalid cursor");
  return c;
}

