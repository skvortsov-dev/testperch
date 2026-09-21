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

for (const target of [
  "me+paytest@example.com",
  "device:QA-001",
  "teammate@example.com",
]) {
  test(`custom target ${target}: exact read, move, and removal preserve everyone else`, async () => {
    let f = {
      ...flag(),
      inclusionsMap: {
        on: [args.user, target, target + "-other"],
        off: ["unrelated"],
      },
    };
    const { run } = harness(({ query, variables }) => {
      if (query.startsWith("mutation")) {
        f.inclusionsMap = variables.flagConfig.inclusionsMap;
        return { data: { updateFlagConfig: true } };
      }
      return { data: { flags: [f], flagConfig: f } };
    });
    const custom = { ...args, targets: [target], target };
    const scan = await run("scan", custom);
    assert.equal(scan.ok, true);
    assert.equal(scan.assignments.length, 1);
    assert.equal(scan.catalog[0].memberships[0].target, target);
    assert.equal(
      JSON.stringify(scan.catalog).includes(target + "-other"),
      false,
    );
    assert.equal(
      (await run("assign", { ...custom, variant: "off" })).assigned,
      true,
    );
    assert.deepEqual(f.inclusionsMap, {
      on: [args.user, target + "-other"],
      off: ["unrelated", target],
    });
    assert.equal((await run("remove", custom)).removed, true);
    assert.deepEqual(f.inclusionsMap, {
      on: [args.user, target + "-other"],
      off: ["unrelated"],
    });
  });
}

test("multiple IDs are an OR filter and replace the signed-in email", async () => {
  const a = "me+alias@example.com",
    b = "device-42";
  const { run } = harness(() => ({
    data: {
      flags: [
        { ...flag(), id: "100", inclusionsMap: { on: [args.user] } },
        {
          ...flag(),
          id: "101",
          inclusionsMap: { on: [a], off: [b, "private-person"] },
        },
        { ...flag(), id: "102", inclusionsMap: { on: [a + ".suffix"] } },
        { ...flag(), id: "103", deleted: true, inclusionsMap: { on: [a] } },
      ],
    },
  }));
  const r = await run("scan", { ...args, targets: [a, b, a] });
  assert.equal(r.ok, true);
  assert.deepEqual(
    Array.from(r.assignments, (f) => f.id),
    ["101"],
  );
  assert.equal(r.assignments[0].memberships.length, 2);
  assert.equal(r.assignments[0].memberships[0].variants[0].key, "on");
  assert.equal(r.assignments[0].memberships[1].variants[0].key, "off");
  assert.equal(JSON.stringify(r.catalog).includes("private-person"), false);
});

test("multiple selected IDs never cause an implicit bulk mutation", async () => {
  let f = {
      ...flag(),
      inclusionsMap: { on: ["alias", "device", args.user], off: [] },
    },
    writes = 0;
  const { run } = harness(({ query, variables }) => {
    if (query.startsWith("mutation")) {
      writes++;
      f.inclusionsMap = variables.flagConfig.inclusionsMap;
      return { data: { updateFlagConfig: true } };
    }
    return { data: { flagConfig: f } };
  });
  const custom = { ...args, targets: ["alias", "device"], variant: "off" };
  assert.equal((await run("assign", custom)).ok, false);
  assert.equal(
    (await run("remove", { ...custom, target: args.user })).ok,
    false,
  );
  assert.equal(writes, 0);
  assert.equal(
    (await run("assign", { ...custom, target: "device" })).assigned,
    true,
  );
  assert.deepEqual(f.inclusionsMap, {
    on: ["alias", args.user],
    off: ["device"],
  });
  assert.equal(writes, 1);
});

test("invalid targets fail closed before requests and do not fall back to the actor", async () => {
  const { run } = harness(() =>
    assert.fail("Invalid IDs must not reach the API"),
  );
  for (const targets of [
    [],
    null,
    "",
    [""],
    [null],
    ["a b"],
    ["a,b"],
    ["a\nb"],
    ["x".repeat(1025)],
    Array(21).fill("a"),
  ]) {
    assert.equal((await run("scan", { ...args, targets })).ok, false);
    assert.equal((await run("remove", { ...args, targets })).ok, false);
  }
});

test("custom IDs do not bypass actor, organization, or session-switch checks", async () => {
  let calls = 0;
  const { run, org } = harness(() => {
    calls++;
    org.user = "new-actor@example.com";
    return { data: { flagConfig: flag() } };
  });
  const custom = {
    ...args,
    targets: ["custom"],
    target: "custom",
    variant: "off",
  };
  assert.equal((await run("assign", { ...custom, user: "custom" })).ok, false);
  assert.equal((await run("assign", { ...custom, orgId: "8" })).ok, false);
  assert.equal(calls, 0);
  assert.equal((await run("assign", custom)).ok, false);
  assert.equal(calls, 1); // Read completed; the changed actor blocks the mutation.
});

test("custom assignment read-back verifies the target rather than the actor", async () => {
  const { run } = harness(({ query }) => ({
    data: query.startsWith("mutation")
      ? { updateFlagConfig: true }
      : {
          flagConfig: {
            ...flag(),
            inclusionsMap: { off: [args.user], on: ["device"] },
          },
        },
  }));
  assert.equal(
    (
      await run("assign", {
        ...args,
        targets: ["device"],
        target: "device",
        variant: "off",
      })
    ).ok,
    false,
  );
});
