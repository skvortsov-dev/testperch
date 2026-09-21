import test from "node:test";
import assert from "node:assert/strict";
import {
  parseTargets,
  restoredTargets,
  isCustomTarget,
} from "../src/popup/target.js";
import { createDemo } from "../src/popup/demo.js";

test("parses multiple exact IDs, preserves case and plus aliases, deduplicates", () => {
  assert.deepEqual(
    parseTargets(
      " Alex+Pay@example.com,device:01\nAlex+Pay@example.com; alex@example.com ",
    ),
    ["Alex+Pay@example.com", "device:01", "alex@example.com"],
  );
  assert.equal(isCustomTarget(["me"], "me"), false);
  assert.equal(isCustomTarget(["me", "alias"], "me"), true);
});
test("rejects empty, invalid and oversized ID lists without falling back", () => {
  for (const input of [
    "",
    " , ;\n ",
    "a b",
    "abc\u0000",
    "x".repeat(1025),
    Array.from({ length: 21 }, (_, i) => `d${i}`).join("\n"),
  ])
    assert.throws(() => parseTargets(input));
});
test("restores custom IDs only for the same session actor and organization", () => {
  const account = { user: "me", orgId: "7" };
  const saved = { ...account, targets: ["alias", "device-42"] };
  assert.deepEqual(restoredTargets(saved, account), saved.targets);
  assert.deepEqual(restoredTargets({ ...saved, targets: [] }, account), ["me"]);
  for (const invalid of [
    null,
    { ...saved, user: "other" },
    { ...saved, orgId: "8" },
    { ...saved, targets: [null] },
    { ...saved, targets: ["a,b"] },
  ])
    assert.deepEqual(restoredTargets(invalid, account), ["me"]);
});
test("demo custom edits preserve actor, other IDs and other projects", () => {
  const demo = createDemo();
  const targets = [
    "alex@example.com",
    "alex+checkout@example.com",
    "demo-device-01",
  ];
  const checkout = () => demo.scan("demo-dev", targets).catalog[0];
  assert.deepEqual(
    checkout().memberships.map((m) => m.variants.map((v) => v.key)),
    [["one-page"], ["classic"], []],
  );
  demo.change("demo-dev", "demo-1", "express", targets[1]);
  demo.change("demo-dev", "demo-1", null, targets[0]);
  assert.deepEqual(
    checkout().memberships.map((m) => m.variants.map((v) => v.key)),
    [[], ["express"], []],
  );
  assert.deepEqual(demo.scan("demo-prod", targets).catalog[0].variants, []);
});
