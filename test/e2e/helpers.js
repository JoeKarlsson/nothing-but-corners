import { expect } from "@playwright/test";

export const FRAME_MS = 16;

// Open the page on a paused fake clock, so tests step through runs frame by frame.
// Collects console errors and page crashes into the returned list.
export async function openPage(page, { reducedMotion = false } = {}) {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error" && !message.text().includes("favicon")) errors.push(message.text());
  });
  if (reducedMotion) await page.emulateMedia({ reducedMotion: "reduce" });
  await page.clock.install({ time: 0 });
  await page.goto("/?test");
  await expect(page.locator(".logo")).toHaveCount(1);
  // Stop time flowing on its own: from here, only runFor moves it.
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 100));
  return errors;
}

export function readState(page) {
  return page.evaluate(() => {
    const game = window.nothingButCorners;
    return {
      mode: game.mode,
      corners: game.corners,
      jackpotActive: game.jackpotActive,
      bounds: game.bounds,
      logos: game.logos,
    };
  });
}

// Step the fake clock one frame at a time, recording state, until `done`
// returns true for the latest sample.
export async function sampleUntil(page, done, { maxMs = 30_000 } = {}) {
  const samples = [await readState(page)];
  for (let elapsed = 0; elapsed < maxMs; elapsed += FRAME_MS) {
    await page.clock.runFor(FRAME_MS);
    const sample = await readState(page);
    samples.push(sample);
    if (done(sample, samples)) return samples;
  }
  throw new Error(`Condition not met within ${maxMs}ms of fake time`);
}

export const atCorner = ({ x, y }, { width, height }, tolerance = 0.5) =>
  (Math.abs(x) <= tolerance || Math.abs(x - width) <= tolerance) &&
  (Math.abs(y) <= tolerance || Math.abs(y - height) <= tolerance);
