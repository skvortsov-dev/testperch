import test from "node:test";
import assert from "node:assert/strict";
import { findReadySession } from "../src/popup/connection.js";
test("connects on first open without a saved connection", async () => {
  const calls = [];
  const id = await findReadySession(
    [{ id: 1 }, { id: 2 }],
    null,
    async (id, action) => {
      calls.push([id, action]);
      return { ready: id === 2 };
    },
  );
  assert.equal(id, 2);
  assert.deepEqual(calls, [
    [1, "probe"],
    [2, "probe"],
  ]);
});
test("prefers previous tab and falls back when it closed or signed out", async () => {
  const calls = [];
  const id = await findReadySession(
    [{ id: 1 }, { id: 2 }],
    { tabId: 2 },
    async (id) => {
      calls.push(id);
      if (id === 2) throw new Error("Tab closed");
      return { ready: true };
    },
  );
  assert.equal(id, 1);
  assert.deepEqual(calls, [2, 1]);
});
test("no authenticated tab leaves the sign-in screen without fetching catalogs", async () => {
  assert.equal(
    await findReadySession([{ id: 1 }], null, async (_id, action) => {
      assert.equal(action, "probe");
      return { ready: false, signedIn: false };
    }),
    null,
  );
  assert.equal(
    await findReadySession([], null, () => assert.fail("No tab to probe")),
    null,
  );
});
