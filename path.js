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

// Random lattice step (m, n), coprime, with random signs. The plain
// diagonal (1, 1) is kept but made rarer, since it has no bounces.
export function pickCornerStep(random = Math.random, maxStep = 3) {
  for (;;) {
    const m = 1 + Math.floor(random() * maxStep);
    const n = 1 + Math.floor(random() * maxStep);
    if (greatestCommonDivisor(m, n) !== 1) continue;
    if (m === 1 && n === 1 && random() < 0.7) continue;
    return {
      m: random() < 0.5 ? -m : m,
      n: random() < 0.5 ? -n : n,
    };
  }
}

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

// Plan the next run from unfolded point (x, y) to a corner. From a
// non-corner start (after a resize) it heads for the nearest lattice
// base plus the step, which still ends in a corner.
export function planCornerRun(x, y, width, height, random = Math.random) {
  const step = pickCornerStep(random);
  const x1 = (Math.round(x / width) + step.m) * width;
  const y1 = (Math.round(y / height) + step.n) * height;
  const bounces = [
    ...wallCrossingFractions(x, x1, width),
    ...wallCrossingFractions(y, y1, height),
  ].sort((a, b) => a - b);
  return { x0: x, y0: y, x1, y1, length: Math.hypot(x1 - x, y1 - y), bounces };
}
