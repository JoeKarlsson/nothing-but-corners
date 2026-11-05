import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

// GitHub Pages lets browsers cache files for 10 minutes. If index.html and a
// module it imports come from different deploys, the page dies on load. So
// each import carries a hash of the module's contents: change the module and
// its URL changes too.
test("every module import in index.html is stamped with the module's current hash", () => {
  const page = readFileSync(new URL("../../index.html", import.meta.url), "utf8");
  const imports = [...page.matchAll(/from "\.\/([\w-]+\.js)(?:\?v=(\w+))?"/g)];
  assert.ok(imports.length > 0);
  for (const [, file, stamp] of imports) {
    const source = readFileSync(new URL(`../../${file}`, import.meta.url));
    const hash = createHash("sha256").update(source).digest("hex").slice(0, 8);
    assert.equal(stamp, hash, `In index.html, import ./${file} as "./${file}?v=${hash}"`);
  }
});
