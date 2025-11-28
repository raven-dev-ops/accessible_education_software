import { test, expect } from "@playwright/test";

test("landing page loads and links work", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Accessible Education/i })).toBeVisible();
  await page.getByRole("link", { name: /Go to login/i }).click();
  await expect(page).toHaveURL(/\/login/);
});
