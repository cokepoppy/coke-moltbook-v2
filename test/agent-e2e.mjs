import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const ART_DIR = path.join(ROOT, "test", "artifacts");

function redactKey(key) {
  if (!key || typeof key !== "string") return null;
  const head = key.slice(0, 12);
  return `${head}…(redacted)`;
}

function nowStamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(
    d.getMinutes()
  )}${pad(d.getSeconds())}`;
}

function jsonWrite(rel, data) {
  const p = path.join(ROOT, rel);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(data, null, 2));
}

async function httpJson(url, init) {
  const res = await fetch(url, init);
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const msg =
      data && typeof data === "object" && data.error && data.error.message
        ? String(data.error.message)
        : `HTTP ${res.status}`;
    const err = new Error(msg);
    err.status = res.status;
    err.body = data;
    throw err;
  }
  return data;
}

function authHeaders(key) {
  return { Authorization: `Bearer ${key}` };
}

async function main() {
  const apiBase = process.env.API_BASE || "http://localhost:3001/api/v1";
  const stamp = nowStamp();
  const posterName = `e2e_poster_${stamp}`;
  const voterName = `e2e_voter_${stamp}`;
  const postTitle = `E2E Post ${stamp}`;
  const postContent = `E2E automated post created at ${new Date().toISOString()}`;
  const commentContent = `E2E comment ${stamp}`;

  const out = {
    started_at: new Date().toISOString(),
    api_base: apiBase,
    poster: { name: posterName, api_key: null },
    voter: { name: voterName, api_key: null },
    post: { id: null, title: postTitle },
    comment: { id: null, content: commentContent },
    checks: {}
  };

  // 0) health (non-api base)
  const healthUrl = apiBase.replace(/\/api\/v1\/?$/, "") + "/health";
  out.checks.health = await httpJson(healthUrl);

  // 1) register poster + voter
  const posterReg = await httpJson(`${apiBase}/agents/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: posterName, description: "e2e poster" })
  });
  const posterKey = posterReg.agent.api_key;
  out.checks.poster_register = {
    ...posterReg,
    agent: { ...posterReg.agent, api_key: redactKey(posterKey) }
  };

  const voterReg = await httpJson(`${apiBase}/agents/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: voterName, description: "e2e voter" })
  });
  const voterKey = voterReg.agent.api_key;
  out.checks.voter_register = {
    ...voterReg,
    agent: { ...voterReg.agent, api_key: redactKey(voterKey) }
  };

  // 2) ensure submolt exists: "general"
  const submolts = await httpJson(`${apiBase}/submolts`, { headers: { ...authHeaders(posterKey) } });
  out.checks.submolts = submolts;
  const hasGeneral = Array.isArray(submolts.items) && submolts.items.some((s) => s.name === "general");
  if (!hasGeneral) {
    const created = await httpJson(`${apiBase}/submolts`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders(posterKey) },
      body: JSON.stringify({ name: "general", display_name: "General", description: "Autocreated by e2e" })
    });
    out.checks.submolt_create = created;
  }

  // 3) create post
  const createPost = await httpJson(`${apiBase}/posts`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders(posterKey) },
    body: JSON.stringify({ submolt: "general", title: postTitle, content: postContent })
  });
  out.post.id = createPost.post_id;
  out.checks.post_create = createPost;

  // 4) add comment
  const createComment = await httpJson(`${apiBase}/posts/${out.post.id}/comments`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders(posterKey) },
    body: JSON.stringify({ content: commentContent })
  });
  out.comment.id = createComment.comment_id;
  out.checks.comment_create = createComment;

  // 5) voter votes post + comment
  const postUpvote = await httpJson(`${apiBase}/posts/${out.post.id}/upvote`, {
    method: "POST",
    headers: { ...authHeaders(voterKey) }
  });
  out.checks.post_upvote = postUpvote;

  const commentUpvote = await httpJson(`${apiBase}/comments/${out.comment.id}/upvote`, {
    method: "POST",
    headers: { ...authHeaders(voterKey) }
  });
  out.checks.comment_upvote = commentUpvote;

  // 6) verify: post detail + comments include our comment
  const postDetail = await httpJson(`${apiBase}/posts/${out.post.id}`, { headers: { ...authHeaders(voterKey) } });
  out.checks.post_detail = postDetail;
  const comments = await httpJson(`${apiBase}/posts/${out.post.id}/comments?sort=top`, {
    headers: { ...authHeaders(voterKey) }
  });
  out.checks.post_comments = comments;

  const found = Array.isArray(comments.items) && comments.items.some((c) => c.id === out.comment.id);
  out.checks.assert_comment_present = found;

  out.finished_at = new Date().toISOString();

  const ctxPublic = {
    apiBase,
    stamp,
    postTitle,
    postId: out.post.id,
    poster: { name: posterName },
    voter: { name: voterName }
  };

  const ctxSecrets = {
    posterKey,
    voterKey
  };

  jsonWrite("test/artifacts/e2e-result.json", out);
  jsonWrite("test/artifacts/e2e-context.json", ctxPublic);
  jsonWrite("test/artifacts/e2e-secrets.json", ctxSecrets);

  // also save a small summary for humans
  fs.mkdirSync(ART_DIR, { recursive: true });
  fs.writeFileSync(
    path.join(ART_DIR, "e2e-summary.txt"),
    [`apiBase=${apiBase}`, `postId=${out.post.id}`, `postTitle=${postTitle}`, `poster=${posterName}`, `voter=${voterName}`].join("\n")
  );

  if (!found) {
    process.exitCode = 2;
    console.error("[e2e] comment not found in comments list");
  } else {
    console.log("[e2e] OK:", { postId: out.post.id, commentId: out.comment.id });
  }
}

main().catch((e) => {
  console.error("[e2e] FAIL:", e?.message ?? e);
  if (e?.body) console.error(JSON.stringify(e.body, null, 2));
  process.exit(1);
});
