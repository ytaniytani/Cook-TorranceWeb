#!/usr/bin/env node
/* smoke_test.js — open every .html in a directory under file:// and fail on console errors.
 *
 * Usage:
 *   node smoke_test.js [siteDir] [--playwright <path>] [--wait <ms>] [--quiz]
 *
 *   siteDir        directory containing the .html files (default: cwd)
 *   --playwright   path to the playwright module if not resolvable normally
 *                  (e.g. /opt/node22/lib/node_modules/playwright)
 *   --wait         ms to wait after load for async rendering (default 700)
 *   --quiz         if a page has .quizbox widgets, click through them and report scores
 *
 * Exit code 1 if any page logged a console error or threw. This is the core guarantee
 * for offline sites: no bundler/typecheck exists, so a page that only breaks at runtime
 * (a bad uniform name, a null id, a GLSL typo) is otherwise invisible until a human opens it.
 */
const fs = require("fs");
const path = require("path");

function arg(flag, def) {
  const i = process.argv.indexOf(flag);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : def;
}
const positional = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const SITE = path.resolve(positional[0] || process.cwd());
const PW = arg("--playwright", "playwright");
const WAIT = parseInt(arg("--wait", "700"), 10);
const DO_QUIZ = process.argv.includes("--quiz");

let chromium;
try {
  chromium = require(PW).chromium;
} catch (e) {
  console.error("Could not load playwright from '" + PW + "'.");
  console.error("Pass --playwright <path-to-playwright-module>, e.g. /opt/node22/lib/node_modules/playwright");
  process.exit(2);
}

const pages = fs
  .readdirSync(SITE)
  .filter((f) => f.endsWith(".html"))
  .sort();

if (!pages.length) {
  console.error("No .html files found in " + SITE);
  process.exit(2);
}

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext();
  let anyFail = false;

  for (const file of pages) {
    const page = await ctx.newPage();
    const errors = [];
    page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
    page.on("pageerror", (e) => errors.push("PAGEERROR: " + e.message));

    await page.goto("file://" + path.join(SITE, file), { waitUntil: "load" });
    await page.waitForTimeout(WAIT);

    let extra = "";
    if (DO_QUIZ && (await page.locator(".quizbox").count()) > 0) {
      try {
        const items = await page.locator(".qitem").count();
        for (let i = 0; i < items; i++) {
          await page.locator(".qitem").nth(i).locator("input[type=radio]").first().check();
        }
        await page.locator(".qbtn", { hasText: /答え合わせ|Check/ }).first().click();
        const score = await page.locator(".qscore .n").first().textContent().catch(() => null);
        extra = ` quiz(items=${items}, score=${score})`;
      } catch (e) {
        extra = " quiz(interaction-failed: " + e.message + ")";
      }
    }
    const canvases = await page.locator("canvas").count();

    const ok = errors.length === 0;
    if (!ok) anyFail = true;
    console.log(`[${ok ? "ok" : "FAIL"}] ${file}  canvases=${canvases}${extra}` +
      (ok ? "" : "\n    " + errors.join("\n    ")));
    await page.close();
  }

  await browser.close();
  console.log(anyFail ? "\n=== SOME PAGES HAD ERRORS ===" : "\n=== ALL PAGES CLEAN ===");
  process.exit(anyFail ? 1 : 0);
})();
