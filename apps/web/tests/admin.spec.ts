import { test, expect } from "@playwright/test";

test("admin preview shows OCR issues section", async ({ page }) => {
  await page.goto("/admin?preview=1");
  await expect(page.getByRole("heading", { name: /OCR issues/i })).toBeVisible();
});
