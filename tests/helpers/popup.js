import { JSDOM } from "jsdom";
import { mkdtemp, cp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import assert from "node:assert/strict";

const root = new URL("../../", import.meta.url);
export const actor = "me@example.com";
export const alias = "me+paytest@example.com";
export const second = "me+fresh@example.com";
export const device = "device:QA-001";

export function fixture() {
  const item = (id, name, type, inclusionsMap) => ({
    id,
    name,
    key: name.toLowerCase(),
    type,
    projectId: "42",
    deleted: false,
    version: 1,
    inclusionsMap,
    variants: [
      { key: "on", name: "Enabled" },
      { key: "express", name: "Express" },
    ],
    apiKeys: [{ id: "1", label: "development" }],
  });
  return {
    org: { user: actor, orgId: 7, orgUrl: "demo-org", isLoggedIn: true },
    flags: [
      item("100", "Checkout", "experiment", {
        on: [actor, alias, "unrelated"],
        off: [second],
      }),
      item("101", "Search flag", "release", { on: [device], off: [actor] }),
      item("102", "Navigation", "experiment", {}),
      {
        ...item("103", "Archived", "experiment", { on: [alias] }),
        deleted: true,
      },
      {
        ...item("200", "Production test", "experiment", { on: [alias] }),
        projectId: "43",
      },
    ],
    requests: [],
    writes: [],
    local: {},
    session: {},
    fail: null,
    ignoreWrites: false,
  };
}

export async function settle() {
  for (let i = 0; i < 25; i++)
    await new Promise((resolve) => setImmediate(resolve));
}

/** Runs the real controller, view, bridge and injected connector against an in-memory API. */
export async function popup(t, backend = fixture()) {
  const dir = await mkdtemp(join(tmpdir(), "testperch-popup-"));
  await cp(new URL("src/", root), join(dir, "src"), { recursive: true });
  await cp(new URL("package.json", root), join(dir, "package.json"));
  const dom = new JSDOM(await readFile(new URL("index.html", root), "utf8"), {
    url: "https://app.amplitude.com/testperch-test",
    pretendToBeVisual: true,
  });
  const { window } = dom;
  window.matchMedia = () => ({ matches: false, addEventListener() {} });
  window.__SHARED_GLOBAL_STORE = { get: () => ({ org: backend.org }) };
  window.__activeAppStore = [
    {
      getState: () => ({
        entities: {
          apps: {
            42: { id: 42, name: "Development" },
            43: { id: 43, name: "Production" },
          },
        },
      }),
    },
  ];
  const intervals = new Map();
  const storage = (data) => ({
    get: async (key) => ({ [key]: structuredClone(data[key]) }),
    set: async (values) => Object.assign(data, structuredClone(values)),
    remove: async (keys) => {
      for (const key of Array.isArray(keys) ? keys : [keys]) delete data[key];
    },
  });
  const globals = {
    window,
    document: window.document,
    Option: window.Option,
    Event: window.Event,
    location: window.location,
    localStorage: window.localStorage,
    setInterval: (fn, ms) => {
      intervals.set(ms, fn);
      return ms;
    },
    chrome: {
      storage: {
        local: storage(backend.local),
        session: storage(backend.session),
      },
      tabs: {
        query: async () => [{ id: 7, title: "Amplitude", active: true }],
      },
      scripting: {
        executeScript: async ({ func, args }) => [
          { result: await func(...args) },
        ],
      },
    },
    fetch: async (_url, options) => {
      const body = JSON.parse(options.body);
      backend.requests.push(body);
      if (body.query.includes("flagConfigsInEnv") && backend.waitScan)
        await backend.waitScan;
      if (backend.fail) {
        if (backend.fail === "403") return { ok: false, status: 403 };
        return {
          ok: true,
          json: async () => ({ errors: [{ message: backend.fail }] }),
        };
      }
      let data;
      if (body.query.includes("apiKeysByProject"))
        data = { deployments: [{ id: "1", label: "dev" }] };
      else if (body.query.includes("flagConfigsInEnv"))
        data = {
          flags: backend.flags.filter(
            (f) => f.projectId === body.variables.projectId && !f.deleted,
          ),
        };
      else if (body.query.startsWith("mutation")) {
        backend.writes.push(structuredClone(body.variables));
        const f = backend.flags.find((f) => f.id === body.variables.id);
        if (f.version !== body.variables.flagConfig.version)
          return {
            ok: true,
            json: async () => ({ errors: [{ message: "Version conflict" }] }),
          };
        if (!backend.ignoreWrites) {
          f.inclusionsMap = structuredClone(
            body.variables.flagConfig.inclusionsMap,
          );
          f.version++;
        }
        data = { updateFlagConfig: true };
      } else
        data = {
          flagConfig: backend.flags.find((f) => f.id === body.variables.id),
        };
      return { ok: true, json: async () => structuredClone({ data }) };
    },
  };
  const originals = Object.fromEntries(
    Object.keys(globals).map((k) => [
      k,
      Object.getOwnPropertyDescriptor(globalThis, k),
    ]),
  );
  for (const [key, value] of Object.entries(globals))
    Object.defineProperty(globalThis, key, {
      configurable: true,
      writable: true,
      value,
    });
  let closed = false;
  const close = async () => {
    if (closed) return;
    closed = true;
    dom.window.close();
    for (const [key, descriptor] of Object.entries(originals)) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
    await rm(dir, { recursive: true, force: true });
  };
  t.after(close);
  await import(pathToFileURL(join(dir, "src/popup/controller.js")).href);
  await settle();
  const $ = (selector) => window.document.querySelector(selector);
  const click = async (selector) => {
    assert.ok($(selector), selector);
    assert.equal($(selector).disabled, false, selector);
    $(selector).click();
    await settle();
  };
  const custom = async (value, { includeMe = false } = {}) => {
    if (!$("#target-picker").hidden && $("#target-include-me").checked !== includeMe)
      await click("#target-include-me");
    if ($("#target-panel").hidden) await click("#target-add");
    $("#target-input").value = value.replace(/[\r\n]+/g, ",");
    $("#target-form").dispatchEvent(
      new window.Event("submit", { bubbles: true, cancelable: true }),
    );
    await settle();
    if (!$("#target-picker").hidden && $("#target-include-me").checked !== includeMe)
      await click("#target-include-me");
  };
  const row = (name, target) => {
    const card = [...window.document.querySelectorAll(".test-card")].find(
      (c) => c.querySelector(".card-title").textContent === name,
    );
    return [...(card?.querySelectorAll("form") || [])].find(
      (f) => f.querySelector(".assignment-target").textContent === target,
    );
  };
  const change = async (name, target, key) => {
    const form = row(name, target);
    assert.ok(form, `${name}: ${target}`);
    const select = form.querySelector("select");
    select.value = key;
    select.dispatchEvent(new window.Event("change", { bubbles: true }));
    form.dispatchEvent(
      new window.Event("submit", { bubbles: true, cancelable: true }),
    );
    await settle();
  };
  return { backend, window, $, click, custom, row, change, close, intervals };
}
