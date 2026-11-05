# Nothing But Corners

The DVD screensaver with the boring parts taken out. It hits the corner every time.

https://joekarlsson.github.io/nothing-but-corners/

Click anywhere to add another logo. Press `S` or click "Sound off" for the crowd.

## How it always hits

Mirror the screen across its walls and a bouncing path becomes a straight line. In that unfolded plane every corner is a grid point `(m·W, n·H)`. Aim at one with `gcd(m, n) = 1` and the logo bounces off a few walls, passes no other corner, and lands dead in one (`path.js`). Run the tests with `node --test`.

## Sounds

Cheers in `sounds/` are short cuts from Joe's sound effects library, including Freesound #521900 by mrfossy and #264499 by noah0189.
