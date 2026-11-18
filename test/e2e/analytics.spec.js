import { test, expect } from "@playwright/test";
import { openPage, sampleUntil } from "./helpers.js";

// Playwright counts as a bot, so analytics.js never loads Plausible here. Record
// the calls the page makes instead.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.plausibleEvents = [];
    window.plausible = (name, options) => window.plausibleEvents.push([name, options?.props ?? null]);
  });
});
const events = (page) => page.evaluate(() => window.plausibleEvents);

test("Logo Added is sent once per visit, however many logos are added", async ({ page }) => {
  await openPage(page);
  await page.mouse.click(640, 360);
  await page.mouse.click(200, 200);
  expect((await events(page)).filter(([name]) => name === "Logo Added")).toHaveLength(1);
});

test("Corners Reached is sent once when the count reaches 10", async ({ page }) => {
  await openPage(page);
  for (let i = 0; i < 8; i++) await page.mouse.click(100 + i * 120, 300);
  await sampleUntil(page, (s) => s.corners >= 12, { maxMs: 60_000 });
  const reached = (await events(page)).filter(([name]) => name === "Corners Reached");
  expect(reached).toEqual([["Corners Reached", { count: "10" }]]);
});

test("Full Screen is sent only when the browser grants it", async ({ page }) => {
  await openPage(page);
  await page.evaluate(() => {
    document.documentElement.requestFullscreen = () => Promise.reject(new TypeError("Permissions check failed"));
  });
  await page.locator("#fullscreen").click();
  expect((await events(page)).map(([name]) => name)).not.toContain("Full Screen");

  await page.evaluate(() => {
    document.documentElement.requestFullscreen = async () => {};
  });
  await page.locator("#fullscreen").click();
  await expect.poll(async () => (await events(page)).map(([name]) => name)).toContain("Full Screen");
});

test("the 404 page sends 404 with the missing path", async ({ page }) => {
  // python's http.server serves its own 404 body, so open the page GitHub Pages would serve.
  await page.goto("/404.html");
  expect(await events(page)).toEqual([["404", { path: "/404.html" }]]);
});
