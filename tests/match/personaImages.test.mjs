import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PERSONA_GENRE_KEYS, personaImageFor } from "../../src/features/match/config/personaImages.mjs";
import { personalArchetypeFor } from "../../src/features/match/share/shareArchetypes.mjs";

test("all nine approved personas have distinct original and SD assets with transparency", () => {
  assert.equal(PERSONA_GENRE_KEYS.length, 9);
  const paths = new Set();
  for (const genreKey of PERSONA_GENRE_KEYS) {
    for (const variant of ["original", "sd"]) {
      const image = personaImageFor(genreKey, variant);
      paths.add(image.src);
      assert.ok(image.alt.length > 0);
      const bytes = readFileSync(new URL(`../../public${image.src}`, import.meta.url));
      assert.deepEqual([...bytes.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
      assert.ok(bytes.readUInt32BE(16) >= 1000, `${genreKey}/${variant} width`);
      assert.ok(bytes.readUInt32BE(20) >= 1000, `${genreKey}/${variant} height`);
      assert.equal(bytes[25], 6, `${genreKey}/${variant} must retain RGBA transparency`);
      if (variant === "sd") assert.equal(bytes.readUInt32BE(16), bytes.readUInt32BE(20));
    }
  }
  assert.equal(paths.size, 18);
});

test("taste results and personal share cards use originals, never relationship SDs", () => {
  for (const genreKey of PERSONA_GENRE_KEYS) {
    assert.equal(personalArchetypeFor(genreKey).imageSrc, personaImageFor(genreKey, "original").src);
    assert.notEqual(personalArchetypeFor(genreKey).imageSrc, personaImageFor(genreKey, "sd").src);
  }
});

test("unknown genre keys safely fall back to the matching fantasy variant", () => {
  for (const key of ["unknown", "toString", "__proto__", undefined, null]) {
    assert.deepEqual(personaImageFor(key), personaImageFor("fantasy"));
    assert.deepEqual(personaImageFor(key, "sd"), personaImageFor("fantasy", "sd"));
  }
});
