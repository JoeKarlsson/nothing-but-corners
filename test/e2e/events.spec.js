import { test, expect } from "@playwright/test";
import { openPage, readState, sampleUntil, atCorner } from "./helpers.js";

test("clicking anywhere spawns another logo where you clicked", async ({ page }) => {
  await openPage(page);
  await page.mouse.click(640, 360);
  await page.mouse.click(200, 200);
  await expect(page.locator(".logo")).toHaveCount(3);
  const { logos, bounds } = await readState(page);
  for (const logo of logos) {
    expect(logo.x).toBeGreaterThanOrEqual(0);
    expect(logo.x).toBeLessThanOrEqual(bounds.width);
  }
});

test("clicked-in logos hit corners too", async ({ page }) => {
  await openPage(page);
  await page.mouse.click(500, 300);
  const samples = await sampleUntil(page, (s) => s.corners >= 3, { maxMs: 40_000 });
  expect(samples.at(-1).logos.length).toBeGreaterThanOrEqual(2); // more if a random jackpot topped it up
});

test("clicking the buttons does not spawn logos", async ({ page }) => {
  await openPage(page);
  await page.locator("#sound").click();
  await page.locator("#fullscreen").click();
  await expect(page.locator(".logo")).toHaveCount(1);
});

test("jackpot: every logo hits a corner in the same frame", async ({ page }) => {
  await openPage(page);
  await page.mouse.click(400, 300);
  await page.evaluate(() => window.nothingButCorners.startJackpot());
  const before = await readState(page);
  expect(before.jackpotActive).toBe(true);
  expect(before.logos.length).toBeGreaterThanOrEqual(4); // tops up to four logos
  const samples = await sampleUntil(page, (s) => !s.jackpotActive);
  const finale = samples.at(-1);
  const previous = samples.at(-2);
  expect(finale.corners - previous.corners).toBe(finale.logos.length);
  for (const logo of finale.logos) expect(atCorner(logo, finale.bounds)).toBe(true);
  await expect(page.locator("#banner-text")).toHaveText("Jackpot");
});

test("too many logos: the player jams, everything implodes into a giant, it lands a corner, then resets", async ({ page }) => {
  const errors = await openPage(page);
  for (let i = 0; i < 48; i++) await page.mouse.click(100 + ((i * 37) % 1000), 100 + ((i * 53) % 500));
  expect((await readState(page)).mode).toBe("play");
  await page.mouse.click(640, 360); // the 50th logo
  expect((await readState(page)).mode).toBe("jam");

  await page.mouse.click(300, 300); // clicks are ignored while jammed
  await expect(page.locator(".logo")).toHaveCount(50);

  await page.clock.runFor(1600);
  expect((await readState(page)).mode).toBe("merge");
  // Implosion: speed lines and debris get drawn while everything spirals in.
  await page.clock.runFor(700);
  expect(await page.evaluate(() => {
    const canvas = document.getElementById("burst");
    const pixels = canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height).data;
    for (let i = 3; i < pixels.length; i += 4) if (pixels[i]) return true;
    return false;
  })).toBe(true);
  // Then the silent beat, the impact frames, and the giant bursts out.
  await page.clock.runFor(1300);
  expect((await readState(page)).mode).toBe("giant");
  await expect(page.locator(".logo")).toHaveCount(1);
  const giantWidth = await page.locator(".logo").evaluate((element) => element.getBoundingClientRect().width);
  expect(giantWidth).toBeGreaterThan(500);

  const { corners } = await readState(page);
  await sampleUntil(page, (s) => s.mode === "landing", { maxMs: 10_000 });
  expect((await readState(page)).corners).toBe(corners + 1);

  // The giant shrinks back down into a normal logo, starting from that corner.
  // CSS animations run on real time, not the test's fake clock.
  await expect.poll(async () => (await readState(page)).mode, { timeout: 5000 }).toBe("play");
  const reset = await readState(page);
  await expect(page.locator(".logo")).toHaveCount(1);
  expect(atCorner(reset.logos[0], reset.bounds, 30)).toBe(true);
  await page.clock.runFor(500);
  expect(atCorner((await readState(page)).logos[0], reset.bounds)).toBe(false); // and it keeps going
  expect(errors).toEqual([]);
});
