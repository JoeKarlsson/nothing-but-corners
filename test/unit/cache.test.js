import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

// GitHub Pages lets browsers cache files for 10 minutes. If index.html and a
// module it imports come from different deploys, the page dies on load. So
// each import carries a hash of the module's contents: change the module and
// its URL changes too. The same goes for the analytics script every page loads.
for (const pageFile of ["index.html", "about.html", "404.html"]) {
  test(`every script in ${pageFile} is stamped with the script's current hash`, () => {
    const page = readFileSync(new URL(`../../${pageFile}`, import.meta.url), "utf8");
    const scripts = [...page.matchAll(/(?:from|src=) ?"(?:\.?\/)?([\w-]+\.js)(?:\?v=(\w+))?"/g)];
    assert.ok(scripts.length > 0);
    for (const [, file, stamp] of scripts) {
      const source = readFileSync(new URL(`../../${file}`, import.meta.url));
      const hash = createHash("sha256").update(source).digest("hex").slice(0, 8);
      assert.equal(stamp, hash, `In ${pageFile}, load ${file} as "${file}?v=${hash}"`);
    }
  });
}
