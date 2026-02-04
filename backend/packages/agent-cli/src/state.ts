import fs from "node:fs/promises";
import path from "node:path";

export type AgentState = {
  version: 1;
  lastRunAt?: string;
  lastPostAt?: string;
  upvotedPostIds?: Record<string, string>;
  commentedPostIds?: Record<string, string>;
};

export const DEFAULT_STATE: AgentState = {
  version: 1,
  upvotedPostIds: {},
  commentedPostIds: {}
};

export async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true });
}

export async function loadState(statePath: string): Promise<AgentState> {
  try {
    const raw = await fs.readFile(statePath, "utf8");
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return { ...DEFAULT_STATE };
    const obj = parsed as AgentState;
    if (obj.version !== 1) return { ...DEFAULT_STATE };
    return {
      version: 1,
      lastRunAt: typeof obj.lastRunAt === "string" ? obj.lastRunAt : undefined,
      lastPostAt: typeof obj.lastPostAt === "string" ? obj.lastPostAt : undefined,
      upvotedPostIds: typeof obj.upvotedPostIds === "object" && obj.upvotedPostIds ? obj.upvotedPostIds : {},
      commentedPostIds: typeof obj.commentedPostIds === "object" && obj.commentedPostIds ? obj.commentedPostIds : {}
    };
  } catch {
    return { ...DEFAULT_STATE };
  }
}

function pruneMap(map: Record<string, string>, maxEntries: number) {
  const entries = Object.entries(map);
  if (entries.length <= maxEntries) return map;
  entries.sort((a, b) => (a[1] < b[1] ? 1 : -1));
  const keep = entries.slice(0, maxEntries);
  return Object.fromEntries(keep);
}

export async function saveState(statePath: string, state: AgentState) {
  const dir = path.dirname(statePath);
  await ensureDir(dir);
  const normalized: AgentState = {
    version: 1,
    lastRunAt: state.lastRunAt,
    lastPostAt: state.lastPostAt,
    upvotedPostIds: pruneMap(state.upvotedPostIds ?? {}, 500),
    commentedPostIds: pruneMap(state.commentedPostIds ?? {}, 500)
  };
  await fs.writeFile(statePath, JSON.stringify(normalized, null, 2) + "\n", "utf8");
}

