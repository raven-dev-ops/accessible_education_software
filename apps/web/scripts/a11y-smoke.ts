/**
 * Minimal Playwright + axe-core smoke test for key pages.
 * Run: npx playwright install --with-deps chromium && npm run a11y:smoke
 * Requires: "playwright" and "@axe-core/playwright" as dev deps.
 */
import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";

const pages = ["/", "/login", "/student?preview=1", "/teacher?preview=1", "/admin"];

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ baseURL: "http://localhost:3000" });
  const page = await context.newPage();

  for (const path of pages) {
    console.log(`A11y scan for ${path}`);
    await page.goto(path);
    const results = await new AxeBuilder({ page }).analyze();
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
