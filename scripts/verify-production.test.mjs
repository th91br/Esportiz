import assert from "node:assert/strict";
import test from "node:test";

import {
  assertBundleEnvironment,
  extractModuleScript,
} from "./verify-production.mjs";

test("extractModuleScript accepts attributes in any order", () => {
  const html = `
    <!doctype html>
    <script crossorigin src="/assets/index-123.js" type="module"></script>
  `;

  assert.equal(extractModuleScript(html), "/assets/index-123.js");
});

test("extractModuleScript rejects HTML without a module bundle", () => {
  assert.throws(
    () => extractModuleScript('<script src="/legacy.js"></script>'),
    /does not reference a JavaScript module bundle/,
  );
});

test("assertBundleEnvironment accepts the production project only", () => {
  assert.doesNotThrow(() =>
    assertBundleEnvironment(
      "const project='production-ref';",
      "production-ref",
      "staging-ref",
    ),
  );
});

test("assertBundleEnvironment rejects a staging reference", () => {
  assert.throws(
    () =>
      assertBundleEnvironment(
        "const refs=['production-ref','staging-ref'];",
        "production-ref",
        "staging-ref",
      ),
    /contains the forbidden Supabase project staging-ref/,
  );
});
