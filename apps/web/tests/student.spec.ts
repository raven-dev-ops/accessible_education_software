import { test, expect } from "@playwright/test";

test("student preview loads Braille and TTS sections", async ({ page }) => {
  await page.goto("/student?preview=1");
  await expect(page.getByRole("heading", { name: /Welcome, Student/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: /Braille preview/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: /Text-to-speech sample/i })).toBeVisible();
});

test("student support ticket form accepts input", async ({ page }) => {
  await page.goto("/student?preview=1");
  const textarea = page.getByRole("textbox", { name: /Optional note/i }).first();
  await textarea.fill("Sample ticket description");
  const submit = page.getByRole("button", { name: /Submit ticket/i });
  await expect(submit).toBeEnabled();
});
