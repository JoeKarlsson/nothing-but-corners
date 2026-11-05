# Corner Hit

The bouncing DVD logo from idle DVD players, except it only ever lands in the corner.

Live: https://joekarlsson.github.io/dvd-corner/

Each run picks a random path that bounces off a few walls and then lands exactly in a corner. Unfold the screen by mirroring it across its walls and the bouncing path becomes a straight line. In that unfolded plane every corner is a grid point `(m·W, n·H)`, and aiming at one with `gcd(m, n) = 1` means the logo passes no other corner on the way (`path.js`).

Press `S` or click "Sound off" to hear the room cheer.

Run the tests with `node --test`.
