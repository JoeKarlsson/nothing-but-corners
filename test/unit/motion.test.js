import { test } from "node:test";
import assert from "node:assert/strict";
import { brake, pickDifferent, along } from "../../motion.js";

test("brake keeps full speed outside the window", () => {
  assert.equal(brake(1, 0.12, 0.18), 1);
  assert.equal(brake(0.12, 0.12, 0.18), 1);
});

test("brake eases down to the floor at the corner, never stopping", () => {
  assert.equal(brake(0, 0.12, 0.18), 0.18);
  let previous = Infinity;
  for (let s = 0.119; s >= 0; s -= 0.01) {
    const value = brake(s, 0.12, 0.18);
    assert.ok(value <= previous && value >= 0.18);
    previous = value;
  }
});

test("pickDifferent never repeats the previous pick", () => {
  let last = -1;
  const seen = new Set();
  for (let i = 0; i < 500; i++) {
    const next = pickDifferent(4, last);
    assert.notEqual(next, last);
    assert.ok(next >= 0 && next < 4);
    seen.add(next);
    last = next;
  }
  assert.equal(seen.size, 4);
});

test("pickDifferent with fewer than two choices returns the only one", () => {
  assert.equal(pickDifferent(1, 0), 0);
});

test("along builds a rotate-scale-rotate transform", () => {
  assert.equal(along(0.5, 1.2, 0.8), "rotate(0.5rad) scale(1.2, 0.8) rotate(-0.5rad)");
});
