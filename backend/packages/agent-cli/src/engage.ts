import path from "node:path";
import { MoltbookClient } from "@moltbook/agent";
import type { FeedItem } from "@moltbook/agent";
import { defaultPolicy, type AgentConfig } from "./config.js";
import type { AgentState } from "./state.js";

function pickTemplate(templates: string[], seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return templates[h % templates.length]!;
}

function interpolate(tpl: string, vars: Record<string, string>) {
  return tpl.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? "");
}

function hoursSince(iso?: string) {
  if (!iso) return Infinity;
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return Infinity;
  return (Date.now() - t) / (1000 * 60 * 60);
}

function shouldSkipItem(policy: ReturnType<typeof defaultPolicy>, item: FeedItem) {
  if (policy.submoltsAllow && !policy.submoltsAllow.includes(item.submolt)) return true;
  if (policy.avoidAuthors && policy.avoidAuthors.includes(item.author)) return true;
  return false;
}

export type EngageSummary = {
  status: string;
  feedItems: number;
  upvoted: number;
  commented: number;
  createdPost: boolean;
  dmPendingRequests?: number;
  dmHasNew?: boolean;
};

export async function runEngageOnce(args: {
  config: AgentConfig;
  state: AgentState;
  statePath: string;
}): Promise<{ state: AgentState; summary: EngageSummary }> {
  const policy = defaultPolicy(args.config.policy);
  const client = new MoltbookClient({ apiKey: args.config.apiKey, apiBase: args.config.apiBase });

  const statusRes = await client.status();
  const summary: EngageSummary = {
    status: statusRes.status,
    feedItems: 0,
    upvoted: 0,
    commented: 0,
    createdPost: false
  };

  try {
    const dm = await client.dmCheck();
    summary.dmHasNew = dm.has_new_messages;
    summary.dmPendingRequests = dm.pending_requests;
  } catch {
    // DM check is best-effort
  }

  if (policy.requireClaimed && statusRes.status !== "claimed") {
    return {
      state: { ...args.state, lastRunAt: new Date().toISOString() },
      summary
    };
  }

  const feed = await client.listFeed({ sort: policy.feedSort, limit: policy.feedLimit });
  summary.feedItems = feed.items.length;

  const upvotedPostIds = args.state.upvotedPostIds ?? {};
  const commentedPostIds = args.state.commentedPostIds ?? {};

  for (const item of feed.items) {
    if (summary.upvoted >= policy.maxUpvotesPerRun) break;
    if (shouldSkipItem(policy, item)) continue;
    if (upvotedPostIds[item.id]) continue;
    await client.upvotePost(item.id);
    upvotedPostIds[item.id] = new Date().toISOString();
    summary.upvoted++;
  }

  for (const item of feed.items) {
    if (summary.commented >= policy.maxCommentsPerRun) break;
    if (shouldSkipItem(policy, item)) continue;
    if (commentedPostIds[item.id]) continue;
    const tpl = pickTemplate(policy.commentTemplates, item.id);
    const content = interpolate(tpl, { title: item.title, submolt: item.submolt, author: item.author });
    await client.comment(item.id, { content });
    commentedPostIds[item.id] = new Date().toISOString();
    summary.commented++;
  }

  const autoPostSubmolt = typeof policy.autoPostSubmolt === "string" && policy.autoPostSubmolt.length > 0 ? policy.autoPostSubmolt : undefined;
  if (autoPostSubmolt && hoursSince(args.state.lastPostAt) >= policy.autoPostEveryHours) {
    const titleTpl = policy.autoPostTitleTemplate ?? "Heartbeat report ({{date}})";
    const contentTpl =
      policy.autoPostContentTemplate ??
      [
        "Automated heartbeat tick.",
        "",
        "- Upvoted: {{upvoted}}",
        "- Commented: {{commented}}",
        "- Feed items considered: {{feedItems}}",
        "",
        "_Note: This is generated locally by an agent CLI._"
      ].join("\n");
    const date = new Date().toISOString().slice(0, 10);
    const vars = {
      date,
      upvoted: String(summary.upvoted),
      commented: String(summary.commented),
      feedItems: String(summary.feedItems),
      statePath: path.relative(process.cwd(), args.statePath)
    };
    await client.createPost({
      submolt: autoPostSubmolt,
      title: interpolate(titleTpl, vars),
      content: interpolate(contentTpl, vars)
    });
    summary.createdPost = true;
    args.state.lastPostAt = new Date().toISOString();
  }

  const nextState: AgentState = {
    version: 1,
    lastRunAt: new Date().toISOString(),
    lastPostAt: args.state.lastPostAt,
    upvotedPostIds,
    commentedPostIds
  };

  return { state: nextState, summary };
}
