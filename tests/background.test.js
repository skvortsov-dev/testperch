import test from "node:test";
import assert from "node:assert/strict";

const snapshot = {
  tabId: 7,
  account: {
    user: "qa@example.com",
    orgId: "9",
    orgUrl: "team",
    projects: [{ id: "42", name: "Development", deployments: [] }],
    failures: [],
  },
  project: "42",
  targets: ["qa@example.com"],
  catalog: [{ id: "old" }],
  updatedAt: 1,
};

function storage(data) {
  return {
    get: async (key) => ({ [key]: structuredClone(data[key]) }),
    set: async (values) => Object.assign(data, structuredClone(values)),
    remove: async (key) => delete data[key],
  };
}

function browserApis(tabs = [{ id: 7, url: "https://app.amplitude.com/" }]) {
  return {
    tabs: { query: async () => structuredClone(tabs) },
    sidePanel: { setPanelBehavior: async () => {} },
  };
}

test("background alarm refreshes the cached catalog without opening the popup", async (t) => {
  const original = globalThis.chrome;
  const local = { autoConnect: true };
  const session = {
    connection: {
      tabId: 7,
      user: "qa@example.com",
      orgId: "9",
      project: "42",
      targets: ["qa@example.com"],
    },
    catalogSnapshot: structuredClone(snapshot),
  };
  const calls = [];
  const listeners = {};
  globalThis.chrome = {
    ...browserApis(),
    storage: { local: storage(local), session: storage(session) },
    scripting: {
      executeScript: async ({ args }) => {
        calls.push(args[0]);
        return [
          {
            result:
              args[0] === "probe"
                ? { ok: true, ready: true, signedIn: true }
                : { ok: true, catalog: [{ id: "fresh" }] },
          },
        ];
      },
    },
    runtime: {
      onInstalled: { addListener: (fn) => (listeners.installed = fn) },
      onStartup: { addListener: (fn) => (listeners.startup = fn) },
    },
    alarms: {
      create: async () => {},
      onAlarm: { addListener: (fn) => (listeners.alarm = fn) },
    },
  };
  t.after(() => {
    if (original === undefined) delete globalThis.chrome;
    else globalThis.chrome = original;
  });

  const { refreshCatalogSnapshot } = await import(
    `../src/background.js?test=${Date.now()}`
  );
  assert.equal(await refreshCatalogSnapshot(), true);
  assert.deepEqual(calls, ["probe", "scan"]);
  assert.deepEqual(session.catalogSnapshot.catalog, [{ id: "fresh" }]);
  assert.ok(session.catalogSnapshot.updatedAt > 1);
  assert.equal(typeof listeners.alarm, "function");
});

test("background refresh keeps the last snapshot when Amplitude is signed out", async (t) => {
  const original = globalThis.chrome;
  const session = {
    connection: {
      tabId: 7,
      user: "qa@example.com",
      orgId: "9",
      project: "42",
      targets: ["qa@example.com"],
    },
    catalogSnapshot: structuredClone(snapshot),
  };
  globalThis.chrome = {
    ...browserApis(),
    storage: {
      local: storage({ autoConnect: true }),
      session: storage(session),
    },
    scripting: {
      executeScript: async () => [
        { result: { ok: true, ready: false, signedIn: false } },
      ],
    },
    runtime: {
      onInstalled: { addListener() {} },
      onStartup: { addListener() {} },
    },
    alarms: { create: async () => {}, onAlarm: { addListener() {} } },
  };
  t.after(() => {
    if (original === undefined) delete globalThis.chrome;
    else globalThis.chrome = original;
  });

  const { refreshCatalogSnapshot } = await import(
    `../src/background.js?signedout=${Date.now()}`
  );
  assert.equal(await refreshCatalogSnapshot(), false);
  assert.deepEqual(session.catalogSnapshot, snapshot);
});

test("a slow background read cannot overwrite a newer popup snapshot", async (t) => {
  const original = globalThis.chrome;
  const session = {
    connection: {
      tabId: 7,
      user: "qa@example.com",
      orgId: "9",
      project: "42",
      targets: ["qa@example.com"],
    },
    catalogSnapshot: structuredClone(snapshot),
  };
  let releaseScan;
  let markScanStarted;
  const scanStarted = new Promise((resolve) => (markScanStarted = resolve));
  const waitForScan = new Promise((resolve) => (releaseScan = resolve));
  globalThis.chrome = {
    ...browserApis(),
    storage: {
      local: storage({ autoConnect: true }),
      session: storage(session),
    },
    scripting: {
      executeScript: async ({ args }) => {
        if (args[0] === "probe")
          return [{ result: { ok: true, ready: true, signedIn: true } }];
        markScanStarted();
        await waitForScan;
        return [{ result: { ok: true, catalog: [{ id: "background" }] } }];
      },
    },
    runtime: {
      onInstalled: { addListener() {} },
      onStartup: { addListener() {} },
    },
    alarms: { create: async () => {}, onAlarm: { addListener() {} } },
  };
  t.after(() => {
    if (original === undefined) delete globalThis.chrome;
    else globalThis.chrome = original;
  });

  const { refreshCatalogSnapshot } = await import(
    `../src/background.js?race=${Date.now()}`
  );
  const refresh = refreshCatalogSnapshot();
  await scanStarted;
  session.catalogSnapshot = {
    ...session.catalogSnapshot,
    catalog: [{ id: "popup" }],
    updatedAt: 2,
  };
  releaseScan();
  assert.equal(await refresh, false);
  assert.deepEqual(session.catalogSnapshot.catalog, [{ id: "popup" }]);
});

test("background does nothing after explicit disconnect or without a complete snapshot", async (t) => {
  const original = globalThis.chrome;
  const calls = [];
  const session = {
    connection: {
      tabId: 7,
      user: "qa@example.com",
      orgId: "9",
      project: "42",
      targets: ["qa@example.com"],
    },
    catalogSnapshot: structuredClone(snapshot),
  };
  globalThis.chrome = {
    ...browserApis(),
    storage: {
      local: storage({ autoConnect: false }),
      session: storage(session),
    },
    scripting: {
      executeScript: async () => {
        calls.push("injected");
        return [];
      },
    },
    runtime: {
      onInstalled: { addListener() {} },
      onStartup: { addListener() {} },
    },
    alarms: { create: async () => {}, onAlarm: { addListener() {} } },
  };
  t.after(() => {
    if (original === undefined) delete globalThis.chrome;
    else globalThis.chrome = original;
  });

  const { refreshCatalogSnapshot } = await import(
    `../src/background.js?disabled=${Date.now()}`
  );
  assert.equal(await refreshCatalogSnapshot(), false);
  delete session.catalogSnapshot;
  assert.equal(await refreshCatalogSnapshot(), false);
  assert.deepEqual(calls, []);
});

test("background scan failure preserves the last good snapshot", async (t) => {
  const original = globalThis.chrome;
  const session = {
    connection: {
      tabId: 7,
      user: "qa@example.com",
      orgId: "9",
      project: "42",
      targets: ["qa@example.com"],
    },
    catalogSnapshot: structuredClone(snapshot),
  };
  globalThis.chrome = {
    ...browserApis(),
    storage: {
      local: storage({ autoConnect: true }),
      session: storage(session),
    },
    scripting: {
      executeScript: async ({ args }) => [
        {
          result:
            args[0] === "probe"
              ? { ok: true, ready: true, signedIn: true }
              : { ok: false, error: "Amplitude: HTTP 503." },
        },
      ],
    },
    runtime: {
      onInstalled: { addListener() {} },
      onStartup: { addListener() {} },
    },
    alarms: { create: async () => {}, onAlarm: { addListener() {} } },
  };
  t.after(() => {
    if (original === undefined) delete globalThis.chrome;
    else globalThis.chrome = original;
  });

  const { refreshCatalogSnapshot } = await import(
    `../src/background.js?failure=${Date.now()}`
  );
  await assert.rejects(refreshCatalogSnapshot(), /HTTP 503/);
  assert.deepEqual(session.catalogSnapshot, snapshot);
});

test("install and startup schedule a five-minute refresh; unrelated alarms are ignored", async (t) => {
  const original = globalThis.chrome;
  const listeners = {};
  const created = [];
  const panelBehaviors = [];
  globalThis.chrome = {
    ...browserApis(),
    sidePanel: {
      setPanelBehavior: async (behavior) => panelBehaviors.push(behavior),
    },
    storage: {
      local: storage({ autoConnect: false }),
      session: storage({}),
    },
    scripting: { executeScript: async () => [] },
    runtime: {
      onInstalled: { addListener: (fn) => (listeners.installed = fn) },
      onStartup: { addListener: (fn) => (listeners.startup = fn) },
    },
    alarms: {
      create: async (name, options) => created.push({ name, options }),
      onAlarm: { addListener: (fn) => (listeners.alarm = fn) },
    },
  };
  t.after(() => {
    if (original === undefined) delete globalThis.chrome;
    else globalThis.chrome = original;
  });

  await import(`../src/background.js?schedule=${Date.now()}`);
  listeners.installed();
  listeners.startup();
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(created, [
    {
      name: "refresh-testing-assignments",
      options: { delayInMinutes: 1, periodInMinutes: 5 },
    },
    {
      name: "refresh-testing-assignments",
      options: { delayInMinutes: 1, periodInMinutes: 5 },
    },
  ]);
  assert.deepEqual(panelBehaviors, [
    { openPanelOnActionClick: true },
    { openPanelOnActionClick: true },
    { openPanelOnActionClick: true },
  ]);
  const before = created.length;
  listeners.alarm({ name: "someone-else" });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(created.length, before);
});

test("background refresh adopts a replacement authorized Amplitude tab", async (t) => {
  const original = globalThis.chrome;
  const session = {
    connection: {
      tabId: 7,
      user: "qa@example.com",
      orgId: "9",
      project: "42",
      targets: ["qa@example.com"],
    },
    catalogSnapshot: structuredClone(snapshot),
  };
  globalThis.chrome = {
    ...browserApis([{ id: 19, url: "https://app.amplitude.com/analytics/team" }]),
    storage: {
      local: storage({ autoConnect: true }),
      session: storage(session),
    },
    scripting: {
      executeScript: async ({ target, args }) => {
        assert.equal(target.tabId, 19);
        return [
          {
            result:
              args[0] === "probe"
                ? {
                    ok: true,
                    ready: true,
                    signedIn: true,
                    user: "qa@example.com",
                    orgId: "9",
                  }
                : { ok: true, catalog: [{ id: "replacement" }] },
          },
        ];
      },
    },
    runtime: {
      onInstalled: { addListener() {} },
      onStartup: { addListener() {} },
    },
    alarms: { create: async () => {}, onAlarm: { addListener() {} } },
  };
  t.after(() => {
    if (original === undefined) delete globalThis.chrome;
    else globalThis.chrome = original;
  });

  const { refreshCatalogSnapshot } = await import(
    `../src/background.js?replacement=${Date.now()}`
  );
  assert.equal(await refreshCatalogSnapshot(), true);
  assert.equal(session.connection.tabId, 19);
  assert.equal(session.catalogSnapshot.tabId, 19);
  assert.deepEqual(session.catalogSnapshot.catalog, [{ id: "replacement" }]);
});
