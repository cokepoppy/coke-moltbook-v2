import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const ctxPath = path.join(ROOT, "test", "artifacts", "e2e-context.json");
const secretsPath = path.join(ROOT, "test", "artifacts", "e2e-secrets.json");

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

async function main() {
  if (!fs.existsSync(ctxPath)) {
    console.log("[cleanup] no context file; nothing to do");
    return;
  }
  const ctx = JSON.parse(fs.readFileSync(ctxPath, "utf8"));
  const secrets = fs.existsSync(secretsPath) ? JSON.parse(fs.readFileSync(secretsPath, "utf8")) : null;
  const apiBase = ctx.apiBase;
  const postId = ctx.postId;
  const posterKey = process.env.POSTER_KEY || secrets?.posterKey;
  if (!apiBase || !postId || !posterKey) throw new Error("invalid context");

  try {
    await httpJson(`${apiBase}/posts/${postId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${posterKey}` }
    });
    console.log("[cleanup] deleted post", postId);
  } catch (e) {
    console.log("[cleanup] delete failed:", e?.message ?? e);
  }
}

main().catch((e) => {
  console.error("[cleanup] FAIL:", e?.message ?? e);
  process.exit(1);
});
