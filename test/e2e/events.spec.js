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

test("too many logos: jam, ki blast, the giant bounces all four corners, stops, crawls into a fifth, then resets", async ({ page }) => {
  const errors = await openPage(page);
  for (let i = 0; i < 48; i++) await page.mouse.click(100 + ((i * 37) % 1000), 100 + ((i * 53) % 500));
  expect((await readState(page)).mode).toBe("play");
  await page.mouse.click(640, 360); // the 50th logo
  expect((await readState(page)).mode).toBe("jam");

  await page.mouse.click(300, 300); // clicks are ignored while jammed
  await expect(page.locator(".logo")).toHaveCount(50);

  await page.clock.runFor(1600);
  expect((await readState(page)).mode).toBe("charge");
  // The logos stream into an energy ball drawn in the middle of the screen.
  await page.clock.runFor(1700);
  await expect(page.locator(".logo")).toHaveCount(0);
  const ballPixel = await page.evaluate(() => {
    const canvas = document.getElementById("aura");
    const scale = canvas.width / innerWidth;
    return [...canvas.getContext("2d").getImageData((innerWidth / 2) * scale, (innerHeight / 2) * scale, 1, 1).data];
  });
  expect(ballPixel).toEqual([255, 255, 255, 255]); // white-hot core

  // Squeeze, then fire: the giant logo blasts out and lands in a corner.
  const { corners } = await readState(page);
  await sampleUntil(page, (s) => s.mode === "fire", { maxMs: 1000 });
  await expect(page.locator(".logo")).toHaveCount(1);
  const giantWidth = await page.locator(".logo").evaluate((element) => element.getBoundingClientRect().width);
  expect(giantWidth).toBeGreaterThan(500);
  // It bounces around all four corners, each one counted, then stops dead
  // in the middle to wind up.
  await sampleUntil(page, (s) => s.mode === "windup", { maxMs: 5000 });
  expect((await readState(page)).corners).toBe(corners + 4);
  const middle = await page.locator(".logo").evaluate((element) => {
    const box = element.getBoundingClientRect();
    return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  });
  expect(Math.abs(middle.x - 640)).toBeLessThan(40);
  expect(Math.abs(middle.y - 360)).toBeLessThan(40);

  // Then it crawls slowly into one last corner: the fifth hit.
  await sampleUntil(page, (s) => s.mode === "crawl", { maxMs: 2000 });
  const crawl = await sampleUntil(page, (s) => s.mode === "landing", { maxMs: 4000 });
  expect(crawl.length * 16).toBeGreaterThan(1500); // slowly
  expect((await readState(page)).corners).toBe(corners + 5);

  // The shatter runs its course, and the giant shrinks back into a normal
  // logo in that corner. Its shrink is a CSS animation, which runs on real
  // time rather than the test's fake clock.
  await page.clock.runFor(1000);
  await expect.poll(async () => (await readState(page)).mode, { timeout: 5000 }).toBe("play");
  const reset = await readState(page);
  await expect(page.locator(".logo")).toHaveCount(1);
  expect(atCorner(reset.logos[0], reset.bounds, 30)).toBe(true);
  await page.clock.runFor(500);
  expect(atCorner((await readState(page)).logos[0], reset.bounds)).toBe(false); // and it keeps going
  expect(errors).toEqual([]);
});

// The fake clock hands requestAnimationFrame the same time as performance.now(),
// which hid a crash that only happened on a real clock. This runs the whole
// meltdown in real time, once, and fails on any page error.
test("the whole meltdown runs on a real clock without errors", async ({ page }) => {
  test.setTimeout(30_000);
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/?test");
  await expect(page.locator(".logo")).toHaveCount(1);
  await page.evaluate(() => {
    for (let i = 0; i < 49; i++) {
      document.body.dispatchEvent(new PointerEvent("pointerdown", { clientX: 80 + ((i * 97) % 1100), clientY: 80 + ((i * 61) % 560), bubbles: true }));
    }
  });
  expect(await page.evaluate(() => window.nothingButCorners.mode)).toBe("jam");
  await page.waitForFunction(() => window.nothingButCorners.mode === "play", null, { timeout: 20_000 });
  expect(await page.evaluate(() => window.nothingButCorners.corners)).toBeGreaterThanOrEqual(5);
  expect(errors).toEqual([]);
});
