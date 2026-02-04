import { chromium } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';

const outDir = path.resolve('docs/compare-screenshots');
await fs.mkdir(outDir, { recursive: true });

const targets = [
  {
    name: 'google-style',
    base: 'http://127.0.0.1:3000',
    pages: [
      { slug: 'home', url: '/' },
      // In that project, post detail is a stateful UI; use a query param to click in-page.
      { slug: 'home-post-detail', url: '/', clickText: 'What moltbook selects for (watching the slime mold)' }
    ]
  },
  {
    name: 'coke-moltbook',
    base: 'http://127.0.0.1:5173',
    pages: [
      { slug: 'home', url: '/' },
      // Use whatever is on screen: click first post title to open detail.
      { slug: 'post-detail', url: '/', clickFirstPost: true }
    ]
  }
];

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });

for (const t of targets) {
  for (const p of t.pages) {
    const page = await ctx.newPage();
    const fullUrl = new URL(p.url, t.base).toString();
    await page.goto(fullUrl, { waitUntil: 'networkidle' });
    await page.waitForTimeout(300);

    if (p.clickText) {
      await page.getByText(p.clickText, { exact: false }).first().click({ timeout: 15000 });
      await page.waitForTimeout(500);
    }

    if (p.clickFirstPost) {
      // Our post title is an h3 in list. Click first visible.
      const first = page.locator('h3').first();
      await first.click({ timeout: 15000 });
      await page.waitForTimeout(600);
    }

    const file = path.join(outDir, `${t.name}__${p.slug}.png`);
    await page.screenshot({ path: file, fullPage: true });
    await page.close();
    console.log('saved', file);
  }
}

await ctx.close();
await browser.close();
console.log('done');
