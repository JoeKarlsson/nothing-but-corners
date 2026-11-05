import { test, expect } from "@playwright/test";
import { openPage, readState, sampleUntil, atCorner, FRAME_MS } from "./helpers.js";

test("loads with one logo, a zero count and share metadata", async ({ page }) => {
  const errors = await openPage(page);
  await expect(page).toHaveTitle("Nothing But Corners");
  await expect(page.locator("#count")).toHaveText("0 corners");
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute("content", /og\.png$/);
  await expect(page.locator('link[rel="icon"]')).toHaveAttribute("href", "favicon.svg");
  await expect(page.locator("#sound")).toHaveAttribute("aria-label", "Turn sound on");
  expect(errors).toEqual([]);
});

test("every static asset the page uses is served", async ({ page, request }) => {
  await openPage(page);
  const sounds = ["cheer-kids", "cheer-kids-yay", "cheer-applause", "cheer-yay", "jam-warble", "jam-stutter",
    "merge-whoosh", "giant-horn", "giant-impact"].map((name) => `/sounds/${name}.mp3`);
  for (const path of [...sounds, "/favicon.svg", "/og.png", "/path.js", "/motion.js"]) {
    expect((await request.get(path)).status(), path).toBe(200);
  }
});

test("the logo hits a corner, lands exactly in it, and the count goes up", async ({ page }) => {
  const errors = await openPage(page);
  const samples = await sampleUntil(page, (s) => s.corners === 1);
  const hit = samples.at(-1);
  expect(atCorner(hit.logos[0], hit.bounds)).toBe(true);
  await expect(page.locator("#count")).toHaveText("1 corner");
  expect(errors).toEqual([]);
});

test("it keeps hitting corners, about every 5-12 seconds", async ({ page }) => {
  await openPage(page);
  const samples = await sampleUntil(page, (s) => s.corners >= 4, { maxMs: 60_000 });
  const seconds = (samples.length * FRAME_MS) / 1000;
  expect(seconds / 4).toBeGreaterThan(2);
  expect(seconds / 4).toBeLessThan(15);
  expect(samples.at(-1).corners).toBeGreaterThanOrEqual(4);
});

test("wall bounces change color and never come close to a corner (no teases)", async ({ page }) => {
  await openPage(page);
  const samples = await sampleUntil(page, (s) => s.corners >= 3, { maxMs: 60_000 });
  let bounces = 0;
  for (let i = 2; i < samples.length; i++) {
    const [a, b, c] = [samples[i - 2], samples[i - 1], samples[i]];
    if (c.corners !== b.corners || b.corners !== a.corners) continue; // corner hits are allowed
    const { width, height } = b.bounds;
    const turnedX = Math.sign(b.logos[0].x - a.logos[0].x) !== Math.sign(c.logos[0].x - b.logos[0].x);
    const turnedY = Math.sign(b.logos[0].y - a.logos[0].y) !== Math.sign(c.logos[0].y - b.logos[0].y);
    if (!turnedX && !turnedY) continue;
    bounces += 1;
    expect(c.logos[0].color, "color changes on a wall bounce").not.toBe(a.logos[0].color);
    const { x, y } = b.logos[0];
    if (turnedX) expect(Math.min(y, height - y) / height).toBeGreaterThan(0.2);
    if (turnedY) expect(Math.min(x, width - x) / width).toBeGreaterThan(0.2);
  }
  expect(bounces).toBeGreaterThan(0);
});

test("cartoon timing: brakes right before the corner, then ricochets out fast", async ({ page }) => {
  await openPage(page);
  const samples = await sampleUntil(page, (s) => s.corners === 1);
  await page.clock.runFor(FRAME_MS);
  samples.push(await readState(page));
  await page.clock.runFor(FRAME_MS);
  samples.push(await readState(page));
  const step = (a, b) => Math.hypot(b.logos[0].x - a.logos[0].x, b.logos[0].y - a.logos[0].y);
  const hitIndex = samples.findIndex((s) => s.corners === 1);
  const cruise = step(samples[10], samples[11]);
  const approach = step(samples[hitIndex - 2], samples[hitIndex - 1]);
  const exit = step(samples[hitIndex + 1], samples[hitIndex + 2]);
  expect(approach).toBeLessThan(cruise * 0.5);
  expect(exit).toBeGreaterThan(cruise * 1.8);
  // Braking starts close to the corner: 50-120px out it is still at full speed (a wall bounce can sit ~150px away).
  const hit = samples[hitIndex].logos[0];
  let checked = 0;
  for (let i = hitIndex - 1; i > 1; i--) {
    const distance = Math.hypot(samples[i].logos[0].x - hit.x, samples[i].logos[0].y - hit.y);
    if (distance > 120) break;
    if (distance > 50) {
      expect(step(samples[i - 1], samples[i])).toBeGreaterThan(cruise * 0.95);
      checked += 1;
    }
  }
  expect(checked).toBeGreaterThan(3);
});

test("resizing the window keeps logos in bounds and still lands corners", async ({ page }) => {
  await openPage(page);
  await page.clock.runFor(2000);
  await page.setViewportSize({ width: 700, height: 500 });
  await page.clock.runFor(FRAME_MS * 2);
  const after = await readState(page);
  expect(after.logos[0].x).toBeLessThanOrEqual(after.bounds.width + 0.5);
  expect(after.logos[0].y).toBeLessThanOrEqual(after.bounds.height + 0.5);
  const samples = await sampleUntil(page, (s) => s.corners >= 1);
  expect(atCorner(samples.at(-1).logos[0], samples.at(-1).bounds)).toBe(true);
});

test("with reduced motion, corners still count but nothing flashes or shakes", async ({ page }) => {
  await openPage(page, { reducedMotion: true });
  await sampleUntil(page, (s) => s.corners === 1);
  const animating = await page.evaluate(() =>
    ["#flash", "#stage", "#banner"].some((selector) => document.querySelector(selector).getAnimations().length > 0));
  expect(animating).toBe(false);
  await expect(page.locator("#count")).toHaveText("1 corner");
});
