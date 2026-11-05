# Nothing But Corners

The DVD screensaver with the boring parts taken out. It hits the corner every time.

https://joekarlsson.github.io/nothing-but-corners/

- Click anywhere to add another logo.
- `S` or the speaker icon for sound, `F` or the corners icon for full screen.

## How it always hits

Mirror the screen across its walls and a bouncing path becomes a straight line. In that unfolded plane every corner is a grid point `(m·W, n·H)`. Aim at one with `gcd(m, n) = 1` and the logo bounces off a few walls, passes no other corner, and lands dead in one. Runs whose wall bounces come within a quarter screen of a corner are thrown out, so there are no near misses (`path.js`). The brake-in and ricochet-out timing lives in `motion.js`.

## Tests

```
npm install
npm test            # unit tests, then browser tests
npm run test:unit   # path and timing logic (node:test)
npm run test:e2e    # every feature in Chrome (Playwright, on a fake clock)
```

The browser tests use your installed Chrome and open the page with `?test`, which exposes a read-only `window.nothingButCorners` handle.

## Sounds

Short cuts from Joe's sound effects library, including these from Freesound: #563845 by disarmenemyships, #875405 by assetsmith, #834162 by jw_audio, #402451 by plasterbrain, #131930 by mcpable, #512389 by kievinay.
