import path from "node:path";
import { parseArgs, getFlagString, getFlagBoolean } from "./args.js";
import { getProjectRoot, loadAgentConfig, maskApiKey } from "./config.js";
import { loadState, saveState } from "./state.js";
import { registerAgent } from "./register.js";
import { createPost } from "./post.js";
import { runEngageOnce } from "./engage.js";

function usage() {
  return [
    "moltbook-agent CLI",
    "",
    "Commands:",
    "  register --name <string> [--description <string>] [--apiBase <url>]",
    "  post --submolt <name> --title <string> [--content <string> | --url <url>] [--apiBase <url>] [--apiKey <key> | --config <path>]",
    "  engage --config <path> --once",
    "",
    "Notes:",
    "  - Default apiBase: http://localhost:3001/api/v1",
    "  - For auth-required commands, apiKey is read from --apiKey, --config, or $MOLTBOOK_API_KEY"
  ].join("\n");
}

function getDefaultApiBase(v?: string) {
  return (v ?? "http://localhost:3001/api/v1").replace(/\/+$/, "");
}

async function resolveApiKey(args: Record<string, string | boolean>, projectRoot: string) {
  const apiKey = getFlagString(args, "apiKey") ?? process.env.MOLTBOOK_API_KEY ?? process.env.AGENT_API_KEY;
  if (apiKey) return apiKey;
  const cfgRel = getFlagString(args, "config");
  if (!cfgRel) return undefined;
  const cfg = await loadAgentConfig(path.resolve(projectRoot, cfgRel));
  return cfg.apiKey;
}

async function main() {
  const projectRoot = getProjectRoot();
  const parsed = parseArgs(process.argv.slice(2));
  const cmd = parsed.command;
  const flags = parsed.flags;

  if (!cmd || cmd === "help" || getFlagBoolean(flags, "help")) {
    console.log(usage());
    process.exit(0);
  }

  if (cmd === "register") {
    const name = getFlagString(flags, "name");
    const description = getFlagString(flags, "description");
    const apiBase = getDefaultApiBase(getFlagString(flags, "apiBase"));
    if (!name) throw new Error("register: --name is required");
    const out = await registerAgent({ apiBase, name, description });
    console.log("Agent registered.");
    console.log(`Claim URL: ${out.agent.claim_url}`);
    console.log(`Verification code: ${out.agent.verification_code}`);
    console.log("");
    console.log("SAVE THIS API KEY (store it locally; do not commit):");
    console.log(out.agent.api_key);
    process.exit(0);
  }

  if (cmd === "post") {
    const submolt = getFlagString(flags, "submolt");
    const title = getFlagString(flags, "title");
    const content = getFlagString(flags, "content");
    const url = getFlagString(flags, "url");
    const apiBase = getFlagString(flags, "apiBase");
    if (!submolt) throw new Error("post: --submolt is required");
    if (!title) throw new Error("post: --title is required");
    if (!!content === !!url) throw new Error("post: exactly one of --content or --url is required");

    const apiKey = await resolveApiKey(flags, projectRoot);
    if (!apiKey) throw new Error("post: apiKey missing (use --apiKey, --config, or $MOLTBOOK_API_KEY)");
    const res = await createPost({ apiKey, apiBase, submolt, title, content, url });
    console.log(`Posted. post_id=${res.post_id} (apiKey=${maskApiKey(apiKey)})`);
    process.exit(0);
  }

  if (cmd === "engage") {
    const configRel = getFlagString(flags, "config");
    const once = getFlagBoolean(flags, "once");
    if (!configRel) throw new Error("engage: --config is required");
    if (!once) throw new Error("engage: --once is required");

    const configPath = path.resolve(projectRoot, configRel);
    const config = await loadAgentConfig(configPath);

    const statePath = path.resolve(projectRoot, "memory/agent-state.json");
    const state = await loadState(statePath);
    const { state: nextState, summary } = await runEngageOnce({ config, state, statePath });
    await saveState(statePath, nextState);

    const dm = summary.dmPendingRequests !== undefined ? ` dms(pending=${summary.dmPendingRequests},new=${summary.dmHasNew})` : "";
    console.log(
      `Engage tick: status=${summary.status} feed=${summary.feedItems} upvoted=${summary.upvoted} commented=${summary.commented} posted=${summary.createdPost}${dm}`
    );
    process.exit(0);
  }

  throw new Error(`Unknown command: ${cmd}\n\n${usage()}`);
}

main().catch((err) => {
  const msg = err instanceof Error ? err.message : String(err);
  console.error(msg);
  process.exit(1);
});

