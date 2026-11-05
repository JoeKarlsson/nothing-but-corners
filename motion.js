// Cartoon timing helpers, kept free of the DOM so they can be tested.

// Speed multiplier for the last moment before a corner: full speed until
// the window, then a hard, eased brake down to the floor (slow in).
export function brake(secondsLeft, window, floor) {
  return secondsLeft < window ? floor + (1 - floor) * (secondsLeft / window) ** 2 : 1;
}

// A random index in [0, count) that differs from `except`, so colors and
// cheers never repeat back to back.
export function pickDifferent(count, except, random = Math.random) {
  if (count < 2) return 0;
  let next;
  do next = Math.floor(random() * count); while (next === except);
  return next;
}

// CSS transform that stretches along an angle and squeezes across it.
export function along(angle, stretch, squeeze) {
  return `rotate(${angle}rad) scale(${stretch}, ${squeeze}) rotate(${-angle}rad)`;
}
