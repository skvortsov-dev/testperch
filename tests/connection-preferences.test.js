import test from "node:test";
import assert from "node:assert/strict";
import {
  isAutoConnectEnabled,
  setAutoConnectEnabled,
} from "../src/popup/connection-preferences.js";

test("first-run auto-connect is on, explicit disconnect survives reopening, reconnect restores it", async () => {
  const saved = {};
  globalThis.chrome = {
    storage: {
      local: {
        get: async (key) => ({ [key]: saved[key] }),
        set: async (values) => Object.assign(saved, values),
      },
    },
  };
  try {
    assert.equal(await isAutoConnectEnabled(), true);
    await setAutoConnectEnabled(false);
    assert.equal(await isAutoConnectEnabled(), false);
    // A fresh read has no dependence on popup state.
    assert.deepEqual(saved, { autoConnect: false });
    await setAutoConnectEnabled(true);
    assert.equal(await isAutoConnectEnabled(), true);
  } finally {
    delete globalThis.chrome;
  }
});

test("preview uses its own local preference without storing an account or credentials", async () => {
  const saved = new Map();
  globalThis.localStorage = {
    getItem: (key) => saved.get(key) ?? null,
    setItem: (key, value) => saved.set(key, value),
  };
  try {
    assert.equal(await isAutoConnectEnabled(), true);
    await setAutoConnectEnabled(false);
    assert.equal(await isAutoConnectEnabled(), false);
    assert.deepEqual([...saved], [["testperch-auto-connect", "false"]]);
  } finally {
    delete globalThis.localStorage;
  }
});

test("failed preference write is surfaced instead of claiming a persistent disconnect", async () => {
  globalThis.chrome = {
    storage: {
      local: {
        set: async () => {
          throw new Error("Storage unavailable");
        },
      },
    },
  };
  try {
    await assert.rejects(setAutoConnectEnabled(false), /Storage unavailable/);
  } finally {
    delete globalThis.chrome;
  }
});
