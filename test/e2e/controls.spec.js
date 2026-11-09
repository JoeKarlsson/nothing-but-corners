import { test, expect } from "@playwright/test";
import { openPage } from "./helpers.js";

test("the sound button toggles its icon and label and loads every sound", async ({ page }) => {
  const errors = await openPage(page);
  const sound = page.locator("#sound");
  const iconPath = () => sound.locator(".icon-detail").getAttribute("d");
  const offIcon = await iconPath();

  await sound.click();
  await expect(sound).toHaveAttribute("aria-label", "Turn sound off");
  expect(await iconPath()).not.toBe(offIcon);
  await expect.poll(() => page.evaluate(() => window.nothingButCorners.soundsLoaded)).toBe(true);

  await page.keyboard.press("s");
  await expect(sound).toHaveAttribute("aria-label", "Turn sound on");
  expect(await iconPath()).toBe(offIcon);
  expect(errors).toEqual([]);
});

test("the full screen button and F key request full screen, and the icon follows", async ({ page }) => {
  await openPage(page);
  // Headless Chrome can't really go full screen, so stand in for the browser.
  await page.evaluate(() => {
    window.fullscreenRequests = [];
    let current = null;
    Object.defineProperty(document, "fullscreenElement", { get: () => current });
    document.documentElement.requestFullscreen = async () => {
      window.fullscreenRequests.push("enter");
      current = document.documentElement;
      document.dispatchEvent(new Event("fullscreenchange"));
    };
    document.exitFullscreen = async () => {
      window.fullscreenRequests.push("exit");
      current = null;
      document.dispatchEvent(new Event("fullscreenchange"));
    };
  });
  const button = page.locator("#fullscreen");
  await button.click();
  await expect(button).toHaveAttribute("aria-label", "Exit full screen");
  await page.keyboard.press("f");
  await expect(button).toHaveAttribute("aria-label", "Full screen");
  expect(await page.evaluate(() => window.fullscreenRequests)).toEqual(["enter", "exit"]);
});

test("the controls show for a while on arrival, hide when idle and come back on movement", async ({ page }) => {
  await openPage(page);
  await page.clock.runFor(4000);
  await expect(page.locator("#fullscreen")).toBeVisible();
  await page.clock.runFor(2500);
  await expect(page.locator("body")).toHaveClass(/idle/);
  await expect(page.locator("#sound")).toBeHidden();
  await page.mouse.move(100, 100);
  await expect(page.locator("body")).not.toHaveClass(/idle/);
  await expect(page.locator("#sound")).toBeVisible();
});

test("the about button opens the artist statement without dropping a logo", async ({ page }) => {
  await openPage(page);
  const before = await page.locator(".logo").count();
  await page.locator("#about").click();
  await expect(page).toHaveURL(/about\.html$/);
  await expect(page.getByRole("heading", { name: "Artist statement" })).toBeVisible();
  await expect(page.getByText("Mine has nothing to wait for, and every logo hits")).toBeVisible();
  await page.goBack();
  await expect.poll(() => page.locator(".logo").count()).toBe(before);
});
