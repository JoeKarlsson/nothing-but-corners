// Corner-only bouncing, by unfolding the screen.
//
// Mirror the play area across every wall and a bouncing path becomes a
// straight line. In that unfolded plane every screen corner sits on the
// lattice (i*W, j*H). Starting from a corner and heading for the lattice
// point (m*W, n*H) with gcd(m, n) = 1, the line touches no other lattice
// point on the way, so the logo bounces |m|-1 + |n|-1 times off walls and
// then lands exactly in a corner.

export function fold(u, length) {
  const period = 2 * length;
  const r = ((u % period) + period) % period;
  return r <= length ? r : period - r;
}

function greatestCommonDivisor(a, b) {
  while (b) [a, b] = [b, a % b];
  return a;
}

// Every lattice step (m, n) with |m|, |n| <= 3, coprime, in all four
// directions. Each one bounces |m|-1 + |n|-1 times, then hits a corner.
const MAX_STEP = 3;
export const CORNER_STEPS = [];
for (let m = 1; m <= MAX_STEP; m++) {
  for (let n = 1; n <= MAX_STEP; n++) {
    if (greatestCommonDivisor(m, n) !== 1) continue;
    for (const sx of [1, -1]) for (const sy of [1, -1]) CORNER_STEPS.push({ m: sx * m, n: sy * n });
  }
}

// The plain diagonal (1, 1) has no bounces, so it comes up less often.
const stepWeight = (step) => (Math.abs(step.m) === 1 && Math.abs(step.n) === 1 ? 0.3 : 1);

// Fractions of the way from u0 to u1 where the unfolded line crosses a
// wall (a multiple of length), excluding both ends.
export function wallCrossingFractions(u0, u1, length) {
  if (u0 === u1) return [];
  const lo = Math.min(u0, u1);
  const hi = Math.max(u0, u1);
  const fractions = [];
  for (let k = Math.floor(lo / length) + 1; k * length < hi; k++) {
    if (k * length > lo) fractions.push((k * length - u0) / (u1 - u0));
  }
  return fractions;
}

// How close a run comes to a corner at its wall bounces, as a fraction of
// the play area (0 = in a corner, 0.5 = mid-wall).
function nearestCornerApproach(run, width, height) {
  let nearest = Infinity;
  for (const f of run.bounces) {
    const x = fold(run.x0 + (run.x1 - run.x0) * f, width);
    const y = fold(run.y0 + (run.y1 - run.y0) * f, height);
    const fromCornerX = Math.min(x, width - x) / width;
    const fromCornerY = Math.min(y, height - y) / height;
    nearest = Math.min(nearest, Math.max(fromCornerX, fromCornerY));
  }
  return nearest;
}

// No teases: a wall bounce may not land this close to a corner.
export const NEAR_MISS_MARGIN = 0.25;

// Every corner run from unfolded point (x, y). From a non-corner start (a
// clicked-in logo, a resize) each heads for the nearest lattice base plus
// the step, which still ends in a corner.
function cornerRuns(x, y, width, height) {
  return CORNER_STEPS.map((step) => {
    const x1 = (Math.round(x / width) + step.m) * width;
    const y1 = (Math.round(y / height) + step.n) * height;
    const bounces = [
      ...wallCrossingFractions(x, x1, width),
      ...wallCrossingFractions(y, y1, height),
    ].sort((a, b) => a - b);
    const run = { x0: x, y0: y, x1, y1, length: Math.hypot(x1 - x, y1 - y), bounces, step };
    run.nearestApproach = nearestCornerApproach(run, width, height);
    return run;
  });
}

// Runs whose bounces stay clear of every corner. From a corner that is all
// of them. In the rare spot where none qualify, the clearest run is used.
function clearRuns(x, y, width, height) {
  const runs = cornerRuns(x, y, width, height);
  const clear = runs.filter((run) => run.nearestApproach >= NEAR_MISS_MARGIN);
  if (clear.length) return clear;
  return [runs.reduce((a, b) => (b.nearestApproach > a.nearestApproach ? b : a))];
}

// A random clear run to a corner.
export function planCornerRun(x, y, width, height, random = Math.random) {
  const runs = clearRuns(x, y, width, height);
  let ticket = random() * runs.reduce((sum, run) => sum + stepWeight(run.step), 0);
  for (const run of runs) {
    ticket -= stepWeight(run.step);
    if (ticket < 0) return run;
  }
  return runs.at(-1);
}

// Jackpot: for each start point, the clear run closest to `targetLength`,
// so that moving them all on one shared clock looks even.
export function planJackpotRuns(starts, width, height, targetLength) {
  return starts.map(([x, y]) => clearRuns(x, y, width, height).reduce((best, run) =>
    Math.abs(run.length - targetLength) < Math.abs(best.length - targetLength) ? run : best));
}
