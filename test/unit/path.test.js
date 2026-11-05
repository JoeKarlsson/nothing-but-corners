import { test } from "node:test";
import assert from "node:assert/strict";
import {
  fold,
  CORNER_STEPS,
  wallCrossingFractions,
  planCornerRun,
  planJackpotRuns,
  NEAR_MISS_MARGIN,
} from "../../path.js";

const W = 800;
const H = 450;
const isCorner = (x, y) =>
  (Math.abs(x) < 1e-6 || Math.abs(x - W) < 1e-6) &&
  (Math.abs(y) < 1e-6 || Math.abs(y - H) < 1e-6);
const gcd = (a, b) => (b ? gcd(b, a % b) : a);

test("fold mirrors the unfolded line back into the play area", () => {
  assert.equal(fold(0, 100), 0);
  assert.equal(fold(30, 100), 30);
  assert.equal(fold(100, 100), 100);
  assert.equal(fold(130, 100), 70);
  assert.equal(fold(200, 100), 0);
  assert.equal(fold(-30, 100), 30);
  assert.equal(fold(-130, 100), 70);
});

test("CORNER_STEPS are every coprime step up to 3, in all four directions", () => {
  assert.equal(CORNER_STEPS.length, 7 * 4);
  for (const { m, n } of CORNER_STEPS) {
    assert.ok(Math.abs(m) >= 1 && Math.abs(m) <= 3 && Math.abs(n) >= 1 && Math.abs(n) <= 3);
    assert.equal(gcd(Math.abs(m), Math.abs(n)), 1);
  }
  assert.equal(new Set(CORNER_STEPS.map(({ m, n }) => `${Math.sign(m)}${Math.sign(n)}`)).size, 4);
});

test("planCornerRun uses many different paths, with the bounceless diagonal rarer", () => {
  const counts = new Map();
  for (let i = 0; i < 4000; i++) {
    const { step } = planCornerRun(0, 0, W, H);
    const key = `${Math.abs(step.m)},${Math.abs(step.n)}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  assert.equal(counts.size, 7);
  assert.ok(counts.get("1,1") < counts.get("2,3"));
});

test("wallCrossingFractions finds interior wall crossings only", () => {
  assert.deepEqual(wallCrossingFractions(0, 300, 100), [1 / 3, 2 / 3]);
  assert.deepEqual(wallCrossingFractions(300, 0, 100), [2 / 3, 1 / 3]);
  assert.deepEqual(wallCrossingFractions(50, 100, 100), []);
  assert.deepEqual(wallCrossingFractions(50, 50, 100), []);
});

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

test("a run from mid-screen (a clicked-in logo) still ends in a corner", () => {
  const plan = planCornerRun(313, 97, W, H);
  assert.ok(isCorner(fold(plan.x1, W), fold(plan.y1, H)));
});

test("no near misses: bounces stay clear of corners, even from a clicked-in start", () => {
  for (let i = 0; i < 20000; i++) {
    const plan = planCornerRun(Math.random() * W, Math.random() * H, W, H);
    assert.ok(plan.nearestApproach >= NEAR_MISS_MARGIN, `approach ${plan.nearestApproach}`);
  }
});

test("planJackpotRuns gives every logo a corner run near the target length", () => {
  const starts = Array.from({ length: 20 }, () => [Math.random() * W, Math.random() * H]);
  const target = 1.4 * Math.hypot(W, H);
  const runs = planJackpotRuns(starts, W, H, target);
  assert.equal(runs.length, starts.length);
  runs.forEach((run, i) => {
    assert.deepEqual([run.x0, run.y0], starts[i]);
    assert.ok(isCorner(fold(run.x1, W), fold(run.y1, H)));
    assert.ok(run.nearestApproach >= NEAR_MISS_MARGIN);
  });
  const lengths = runs.map((run) => run.length);
  assert.ok(Math.max(...lengths) / Math.min(...lengths) < 2, `lengths spread too far: ${lengths}`);
});
