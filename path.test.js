import { test } from "node:test";
import assert from "node:assert/strict";
import { fold, planCornerRun, NEAR_MISS_MARGIN } from "./path.js";

const W = 800;
const H = 450;
const isCorner = (x, y) =>
  (Math.abs(x) < 1e-6 || Math.abs(x - W) < 1e-6) &&
  (Math.abs(y) < 1e-6 || Math.abs(y - H) < 1e-6);

test("every run ends in a corner and never touches one on the way", () => {
  let x = 0;
  let y = 0;
  for (let run = 0; run < 500; run++) {
    const plan = planCornerRun(x, y, W, H);
    assert.ok(isCorner(fold(plan.x1, W), fold(plan.y1, H)));
    for (const f of plan.bounces) {
      const px = fold(plan.x0 + (plan.x1 - plan.x0) * f, W);
      const py = fold(plan.y0 + (plan.y1 - plan.y0) * f, H);
      assert.ok(!isCorner(px, py), `early corner at fraction ${f}`);
      assert.ok(f > 0 && f < 1);
    }
    const m = Math.abs(plan.x1 - plan.x0) / W;
    const n = Math.abs(plan.y1 - plan.y0) / H;
    assert.equal(plan.bounces.length, Math.round(m) - 1 + Math.round(n) - 1);
    x = plan.x1;
    y = plan.y1;
  }
});

test("a run from mid-screen (after a resize) still ends in a corner", () => {
  const plan = planCornerRun(313, 97, W, H);
  assert.ok(isCorner(fold(plan.x1, W), fold(plan.y1, H)));
});

test("no near misses: bounces stay clear of corners, even from a clicked-in start", () => {
  for (let i = 0; i < 2000; i++) {
    const plan = planCornerRun(Math.random() * W, Math.random() * H, W, H);
    assert.ok(plan.nearestApproach >= NEAR_MISS_MARGIN, `approach ${plan.nearestApproach}`);
  }
});
