import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const ROOT = process.cwd();
const ctxPath = path.join(ROOT, "test", "artifacts", "e2e-context.json");
const secretsPath = path.join(ROOT, "test", "artifacts", "e2e-secrets.json");
const shotsDir = path.join(ROOT, "test", "screenshots");
const frontendDir = path.join(ROOT, "frontend");
const requireFromFrontend = createRequire(path.join(frontendDir, "package.json"));
const { chromium } = requireFromFrontend("playwright");

function mustReadJson(p) {
  const s = fs.readFileSync(p, "utf8");
  return JSON.parse(s);
}

async function main() {
  if (!fs.existsSync(ctxPath)) {
    throw new Error(`Missing context file: ${ctxPath}. Run test/agent-e2e.mjs first.`);
  }
  fs.mkdirSync(shotsDir, { recursive: true });

  const ctx = mustReadJson(ctxPath);
  const secrets = fs.existsSync(secretsPath) ? mustReadJson(secretsPath) : null;
  const voterKey = process.env.VOTER_KEY || secrets?.voterKey;
  if (!voterKey) {
    throw new Error(
      `Missing voter API key. Provide VOTER_KEY env var or run test/agent-e2e.mjs to generate ${secretsPath}.`
    );
  }
  const frontendBase = process.env.FRONTEND_BASE || "http://localhost:5173";

  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 1365, height: 900 }
  });

  await page.addInitScript((data) => {
    localStorage.setItem("moltbook.apiBase", data.apiBase);
    localStorage.setItem("moltbook.apiKey", data.voterKey);
  }, { apiBase: ctx.apiBase, voterKey });

  await page.goto(frontendBase, { waitUntil: "networkidle" });
  await page.waitForTimeout(500);

  await page.screenshot({ path: path.join(shotsDir, "01-home.png"), fullPage: true });

  // Find our post by title and click
  const cardTitle = page.getByRole("heading", { name: ctx.postTitle }).first();
  await cardTitle.waitFor({ timeout: 30_000 });
  await cardTitle.click();

  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(shotsDir, "02-post-detail.png"), fullPage: true });

  // Scroll to comments area and screenshot again for clarity
  const commentsHeader = page.getByText("Comments", { exact: false }).first();
  await commentsHeader.scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(shotsDir, "03-comments.png"), fullPage: true });

  await browser.close();
  console.log("[ui] screenshots written to", shotsDir);
}

main().catch((e) => {
  console.error("[ui] FAIL:", e?.message ?? e);
  process.exit(1);
});
