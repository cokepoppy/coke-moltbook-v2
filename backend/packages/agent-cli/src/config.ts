import fs from "node:fs/promises";
import path from "node:path";

export type EngagePolicy = {
  /**
   * If true, engage will stop when status != "claimed".
   * For local/dev clones you can set this to false.
   */
  requireClaimed?: boolean;

  feedSort?: "hot" | "new" | "top";
  feedLimit?: number;
  maxUpvotesPerRun?: number;
  maxCommentsPerRun?: number;
  commentTemplates?: string[];
  submoltsAllow?: string[];
  avoidAuthors?: string[];
  autoPostEveryHours?: number;
  autoPostSubmolt?: string;
  autoPostTitleTemplate?: string;
  autoPostContentTemplate?: string;
};

export type AgentConfig = {
  apiBase?: string;
  apiKey: string;
  policy?: EngagePolicy;
};

export function getProjectRoot() {
  return process.env.INIT_CWD ? path.resolve(process.env.INIT_CWD) : process.cwd();
}

export async function loadAgentConfig(configPath: string): Promise<AgentConfig> {
  const raw = await fs.readFile(configPath, "utf8");
  const parsed: unknown = JSON.parse(raw);
  if (!parsed || typeof parsed !== "object") throw new Error("Invalid config JSON (expected object)");
  const cfg = parsed as Partial<AgentConfig>;
  if (typeof cfg.apiKey !== "string" || cfg.apiKey.length < 8) throw new Error("Invalid config: apiKey required");
  if (cfg.apiBase !== undefined && typeof cfg.apiBase !== "string") throw new Error("Invalid config: apiBase must be string");
  if (cfg.policy !== undefined && (typeof cfg.policy !== "object" || cfg.policy === null)) {
    throw new Error("Invalid config: policy must be object");
  }
  return cfg as AgentConfig;
}

export function defaultPolicy(
  p?: EngagePolicy
): Required<Pick<EngagePolicy, "requireClaimed" | "feedSort" | "feedLimit" | "maxUpvotesPerRun" | "maxCommentsPerRun" | "commentTemplates" | "autoPostEveryHours">> &
  Omit<EngagePolicy, "requireClaimed" | "feedSort" | "feedLimit" | "maxUpvotesPerRun" | "maxCommentsPerRun" | "commentTemplates" | "autoPostEveryHours"> {
  return {
    requireClaimed: p?.requireClaimed ?? true,
    feedSort: p?.feedSort ?? "new",
    feedLimit: p?.feedLimit ?? 25,
    maxUpvotesPerRun: p?.maxUpvotesPerRun ?? 3,
    maxCommentsPerRun: p?.maxCommentsPerRun ?? 1,
    commentTemplates: p?.commentTemplates ?? [
      `Interesting take — what made you land on this?`,
      `Thanks for sharing. Any context/details you’d add?`,
      `Curious: what’s the next step you’re thinking about?`
    ],
    autoPostEveryHours: p?.autoPostEveryHours ?? 24,
    submoltsAllow: p?.submoltsAllow,
    avoidAuthors: p?.avoidAuthors,
    autoPostSubmolt: p?.autoPostSubmolt,
    autoPostTitleTemplate: p?.autoPostTitleTemplate,
    autoPostContentTemplate: p?.autoPostContentTemplate
  };
}

export function maskApiKey(apiKey: string) {
  const prefix = apiKey.slice(0, Math.min(10, apiKey.length));
  const tail = apiKey.slice(-4);
  return `${prefix}…${tail}`;
}

