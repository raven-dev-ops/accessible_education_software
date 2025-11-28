/**
 * Minimal Playwright + axe-core smoke test for key pages.
 * Run: npx playwright install --with-deps chromium && npm run a11y:smoke
 * Requires: "playwright" and "@axe-core/playwright" as dev deps.
 */
import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";
import fs from "fs";
import path from "path";

const baseURL = process.env.BASE_URL || "http://localhost:3000";
const pages =
  (process.env.PAGES && process.env.PAGES.split(",").map((p) => p.trim()).filter(Boolean)) ||
  ["/", "/login", "/student?preview=1", "/teacher?preview=1", "/admin"];
const takeScreenshots = (process.env.TAKE_SCREENSHOTS || "false").toLowerCase() === "true";
const screenshotDir = path.join(process.cwd(), "playwright-visual");

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ baseURL });
  const page = await context.newPage();

  if (takeScreenshots && !fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
  }

  for (const path of pages) {
    console.log(`A11y scan for ${path} (base: ${baseURL})`);
    await page.goto(path, { waitUntil: "networkidle" });
    const results = await new AxeBuilder({ page }).analyze();
    if (takeScreenshots) {
      const safe = path.replace(/[^a-z0-9]/gi, "_").replace(/_+/g, "_") || "home";
      await page.screenshot({ path: `${screenshotDir}/${safe}.png`, fullPage: true });
    }
    if (results.violations.length) {
      console.warn(`Found ${results.violations.length} violations on ${path}`);
      results.violations.forEach((v) => console.warn(v.id, v.help, v.nodes.map((n) => n.target)));
      process.exitCode = 1;
    }
  }

  await browser.close();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
