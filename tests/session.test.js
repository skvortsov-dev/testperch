import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFileSync } from "node:fs";
const source = readFileSync(
  new URL("../src/amplitude/session.js", import.meta.url),
  "utf8",
).replace("export async function", "async function");
function harness(handler) {
  const org = {
    isLoggedIn: true,
    user: "me@example.com",
    orgId: 7,
    orgUrl: "example",
  };
  const context = {
    location: {
      hostname: "app.amplitude.com",
      origin: "https://app.amplitude.com",
    },
    AbortSignal,
    fetch: async (_url, options) => {
      const body = JSON.parse(options.body);
      return { ok: true, json: async () => handler(body) };
    },
  };
  context.window = {
    __SHARED_GLOBAL_STORE: { get: () => ({ org }) },
    __activeAppStore: [
      {
        getState: () => ({
          entities: { apps: { 42: { id: 42, name: "Example" } } },
        }),
      },
    ],
  };
  vm.createContext(context);
  vm.runInContext(source, context);
  return { run: context.amplitudeSession, org };
}
const args = { user: "me@example.com", orgId: "7", project: "42", id: "100" };
const flag = () => ({
  id: "100",
  projectId: "42",
  name: "Example",
  version: 5,
  inclusionsMap: {
    on: ["other@example.com", "me@example.com", "someone, me@example.com"],
    off: ["other-2"],
  },
  variants: [{ key: "on", name: "Enabled" }],
  apiKeys: [{ id: "1", label: "production" }],
});
test("loads projects with deployments from current session", async () => {
  const { run } = harness(() => ({
    data: { deployments: [{ id: "1", label: "production" }] },
  }));
  const r = await run("connect");
  assert.equal(r.ok, true);
  assert.equal(r.user, args.user);
  assert.equal(r.projects[0].id, "42");
});
test("matches exact email and returns no other participants", async () => {
  const f = flag();
  const { run } = harness(() => ({
    data: {
      flags: [
        f,
        { ...f, id: "101", inclusionsMap: { on: ["someone, me@example.com"] } },
      ],
    },
  }));
  const r = await run("scan", args);
  assert.equal(r.assignments.length, 1);
  assert.equal(r.assignments[0].variants[0].name, "Enabled");
  assert.equal(JSON.stringify(r).includes("other@example.com"), false);
});
test("removes only self; preserves other IDs and sends no rollout settings", async () => {
  let f = flag(),
    writes = 0;
  const { run } = harness(({ query, variables }) => {
    if (query.startsWith("mutation")) {
      writes++;
      const input = variables.flagConfig;
      assert.deepEqual(Object.keys(input).sort(), [
        "inclusions",
        "inclusionsMap",
        "version",
      ]);
      assert.equal(input.version, 5);
      assert.deepEqual(JSON.parse(JSON.stringify(input.inclusionsMap)), {
        on: ["other@example.com", "someone, me@example.com"],
        off: ["other-2"],
      });
      f = { ...f, inclusionsMap: input.inclusionsMap };
      return { data: { updateFlagConfig: true } };
    }
    return { data: { flagConfig: f } };
  });
  assert.equal((await run("remove", args)).removed, true);
  assert.equal(writes, 1);
});
test("account switch blocks writes", async () => {
  const { run, org } = harness(() => {
    throw Error("must not call API");
  });
  org.user = "someone@example.com";
  assert.equal((await run("remove", args)).ok, false);
});
test("wrong project blocks writes", async () => {
  const { run } = harness(({ query }) => {
    assert.equal(query.startsWith("mutation"), false);
    return { data: { flagConfig: { ...flag(), projectId: "99" } } };
  });
  assert.equal((await run("remove", args)).ok, false);
});
test("unconfirmed deletion is an error", async () => {
  const { run } = harness(({ query }) => ({
    data: query.startsWith("mutation")
      ? { updateFlagConfig: true }
      : { flagConfig: flag() },
  }));
  const r = await run("remove", args);
  assert.equal(r.ok, false);
  assert.match(r.error, /not confirmed/);
});
test("malformed inclusions reports incomplete list", async () => {
  const { run } = harness(() => ({
    data: { flags: [{ ...flag(), inclusionsMap: { on: "me@example.com" } }] },
  }));
  const r = await run("scan", args);
  assert.equal(r.assignments.length, 0);
  assert.equal(r.failures.length, 1);
});
test("server version conflict is not retried", async () => {
  let writes = 0;
  const { run } = harness(({ query }) => {
    if (query.startsWith("mutation")) {
      writes++;
      return { errors: [{ message: "Version conflict" }] };
    }
    return { data: { flagConfig: flag() } };
  });
  const r = await run("remove", args);
  assert.equal(r.ok, false);
  assert.equal(writes, 1);
});
for (const type of ["EXPERIMENT", "FLAG"]) {
  test(`assigns and moves self for ${type}, preserving all other IDs`, async () => {
    let f = {
        ...flag(),
        type,
        variants: [
          { key: "on", name: "Enabled" },
          { key: "off", name: "Disabled" },
        ],
      },
      writes = 0;
    const { run } = harness(({ query, variables }) => {
      if (query.startsWith("mutation")) {
        writes++;
        const input = variables.flagConfig;
        assert.deepEqual(Object.keys(input).sort(), [
          "inclusions",
          "inclusionsMap",
          "version",
        ]);
        assert.deepEqual(input.inclusionsMap, {
          on: ["other@example.com", "someone, me@example.com"],
          off: ["other-2", "me@example.com"],
        });
        assert.deepEqual(input.inclusions, [
          { variantKey: "on", values: input.inclusionsMap.on },
          { variantKey: "off", values: input.inclusionsMap.off },
        ]);
        f = { ...f, inclusionsMap: input.inclusionsMap };
        return { data: { updateFlagConfig: true } };
      }
      return { data: { flagConfig: f } };
    });
    const r = await run("assign", { ...args, variant: "off" });
    assert.equal(r.assigned, true);
    assert.equal(writes, 1);
  });
}
test("catalog includes unassigned flags and actual variant choices without participant IDs", async () => {
  const f = { ...flag(), inclusionsMap: {} };
  const { run } = harness(() => ({ data: { flags: [f] } }));
  const r = await run("scan", args);
  assert.equal(r.assignments.length, 0);
  assert.equal(r.catalog.length, 1);
  assert.equal(
    r.catalog[0].availableVariants.some((v) => v.key === "on"),
    true,
  );
  assert.equal("inclusionsMap" in r.catalog[0], false);
});
test("new assignment creates missing variant map entry", async () => {
  let f = { ...flag(), inclusionsMap: {} };
  const { run } = harness(({ query, variables }) => {
    if (query.startsWith("mutation")) {
      f.inclusionsMap = variables.flagConfig.inclusionsMap;
      assert.deepEqual(f.inclusionsMap, { on: ["me@example.com"] });
      return { data: { updateFlagConfig: true } };
    }
    return { data: { flagConfig: f } };
  });
  assert.equal(
    (await run("assign", { ...args, variant: "on" })).assigned,
    true,
  );
});
test("removed or arbitrary variant blocks mutation", async () => {
  let writes = 0;
  const { run } = harness(({ query }) => {
    if (query.startsWith("mutation")) writes++;
    return { data: { flagConfig: flag() } };
  });
  for (const variant of ["missing", "__proto__", null, ""])
    assert.equal((await run("assign", { ...args, variant })).ok, false);
  assert.equal(writes, 0);
});
test("assignment read-back must show only chosen variant", async () => {
  const { run } = harness(({ query }) => ({
    data: query.startsWith("mutation")
      ? { updateFlagConfig: true }
      : { flagConfig: { ...flag(), variants: [{ key: "off" }] } },
  }));
  assert.equal((await run("assign", { ...args, variant: "off" })).ok, false);
});
test("assignment conflict not retried and changed account rejected", async () => {
  let writes = 0;
  const { run, org } = harness(({ query }) => {
    if (query.startsWith("mutation")) {
      writes++;
      return { errors: [{ message: "Version conflict" }] };
    }
    return { data: { flagConfig: flag() } };
  });
  assert.equal((await run("assign", { ...args, variant: "on" })).ok, false);
  assert.equal(writes, 1);
  org.user = "other@example.com";
  assert.equal((await run("assign", { ...args, variant: "on" })).ok, false);
  assert.equal(writes, 1);
});

test("implicit off variant is offered and can be assigned", async () => {
  let f = flag();
  const { run } = harness(({ query, variables }) => {
    if (query.startsWith("mutation")) {
      f.inclusionsMap = variables.flagConfig.inclusionsMap;
      return { data: { updateFlagConfig: true } };
    }
    return { data: { flagConfig: f, flags: [f] } };
  });
  assert.equal(
    (await run("scan", args)).catalog[0].availableVariants.some(
      (v) => v.key === "off",
    ),
    true,
  );
  assert.equal(
    (await run("assign", { ...args, variant: "off" })).assigned,
    true,
  );
});
test("custom keys cannot change map prototype or lose existing participants", async () => {
  let f = { ...flag(), variants: [{ key: "__proto__", name: "Custom" }] },
    writes = 0;
  const { run } = harness(({ query, variables }) => {
    if (query.startsWith("mutation")) {
      writes++;
      assert.deepEqual(variables.flagConfig.inclusionsMap.__proto__, [
        "me@example.com",
      ]);
      assert.deepEqual(variables.flagConfig.inclusionsMap.on, [
        "other@example.com",
        "someone, me@example.com",
      ]);
      f.inclusionsMap = variables.flagConfig.inclusionsMap;
      return { data: { updateFlagConfig: true } };
    }
    return { data: { flagConfig: f } };
  });
  assert.equal(
    (await run("assign", { ...args, variant: "__proto__" })).assigned,
    true,
  );
  assert.equal(writes, 1);
});

test("null inclusions is an empty assignment list, missing field is not", async () => {
  const f = { ...flag(), inclusionsMap: null };
  const { run } = harness(() => ({
    data: { flags: [f, { ...f, id: "101", inclusionsMap: undefined }] },
  }));
  const r = await run("scan", args);
  assert.equal(r.catalog.length, 1);
  assert.equal(r.assignments.length, 0);
  assert.equal(r.failures.length, 1);
});

test("session readiness probe never calls the API and handles signed-out users", async () => {
  const { run, org } = harness(() => assert.fail("Probe must not fetch"));
  assert.equal((await run("probe")).ready, true);
  org.isLoggedIn = false;
  const result = await run("probe");
  assert.equal(result.ok, true);
  assert.equal(result.ready, false);
  assert.equal(result.signedIn, false);
});
