import test from "node:test";
import assert from "node:assert/strict";
import {
  popup,
  fixture,
  settle,
  actor,
  alias,
  second,
  device,
} from "./helpers/popup.js";

const options = { concurrency: false };
test(
  "full popup: additional IDs with Include me disabled exclude the actor; count is configurations, rows identify targets",
  options,
  async (t) => {
    const p = await popup(t);
    assert.equal(p.$("#mine-count").textContent, "2");
    await p.custom(`${alias}\n${second},${device},${alias}`);
    assert.equal(p.$("#mine-label").textContent, "Assigned tests");
    assert.equal(p.$("#mine-count").textContent, "2");
    assert.equal(
      p.window.document.querySelectorAll(".assignment-target").length,
      3,
    );
    assert.equal(p.row("Checkout", actor), undefined);
    assert.deepEqual(p.backend.session.connection.targets, [
      alias,
      second,
      device,
    ]);
    assert.ok(p.row("Checkout", alias));
    assert.ok(p.row("Checkout", second));
    assert.ok(p.row("Search flag", device));
  },
);
test(
  "full popup: change and leave one alias while preserving actor and other selected IDs",
  options,
  async (t) => {
    const p = await popup(t);
    await p.custom(`${alias},${second},${device}`, { includeMe: true });
    await p.change("Checkout", alias, "express");
    assert.deepEqual(p.backend.flags[0].inclusionsMap, {
      on: [actor, "unrelated"],
      off: [second],
      express: [alias],
    });
    p.row("Checkout", second).querySelector(".leave-button").click();
    await settle();
    assert.deepEqual(p.backend.flags[0].inclusionsMap, {
      on: [actor, "unrelated"],
      off: [],
      express: [alias],
    });
    assert.equal(p.backend.writes.length, 2);
    assert.match(p.$("#status").textContent, /Removed me\+fresh/);
  },
);
test(
  "full popup: find a flag and assign an unassigned device using its actual variant",
  options,
  async (t) => {
    const p = await popup(t);
    await p.custom(`fresh-device,${alias}`);
    await p.click("#explore");
    p.$("#search").value = "search";
    p.$("#search").dispatchEvent(new p.window.Event("input"));
    assert.equal(p.window.document.querySelectorAll(".test-card").length, 1);
    await p.change("Search flag", "fresh-device", "on");
    assert.deepEqual(p.backend.flags[1].inclusionsMap, {
      on: [device, "fresh-device"],
      off: [actor],
    });
    assert.equal(p.backend.writes.length, 1);
  },
);
test(
  "full popup: invalid input hides old actions; empty selection never falls back to actor",
  options,
  async (t) => {
    const p = await popup(t);
    await p.custom("bad id");
    assert.equal(p.$("#target-error").hidden, false);
    assert.equal(p.$("#target-input").getAttribute("aria-invalid"), "true");
    assert.equal(p.window.document.querySelectorAll(".test-card").length, 0);
    await p.click("#target-cancel");
    assert.equal(p.$("#mine-count").textContent, "0");
    await p.custom(" , ;\n ");
    assert.equal(p.$("#target-error").hidden, false);
    assert.equal(p.backend.writes.length, 0);
  },
);
test(
  "full popup: 20 IDs work; 21 are rejected; unknown IDs produce a valid empty list",
  options,
  async (t) => {
    const p = await popup(t);
    const ids = Array.from({ length: 20 }, (_, i) => `qa-device-${i}`);
    await p.custom(ids.join("\n"));
    assert.equal(p.$("#mine-count").textContent, "0");
    assert.match(p.$("#empty-title").textContent, /No assignments/);
    assert.deepEqual(p.backend.session.connection.targets, ids);
    await p.custom([...ids, "one-too-many"].join(","));
    assert.equal(p.$("#target-error").hidden, false);
    assert.deepEqual(p.backend.session.connection.targets, ids);
  },
);
test(
  "full popup: Include me adds and removes actor while preserving additional IDs and assignments",
  options,
  async (t) => {
    const p = await popup(t);
    await p.custom(alias);
    await p.click("#target-include-me");
    assert.equal(p.$("#mine-label").textContent, "Assigned tests");
    assert.deepEqual(p.backend.session.connection.targets, [actor, alias]);
    assert.ok(p.row("Checkout", actor));
    assert.ok(p.row("Checkout", alias));
    await p.click("#target-include-me");
    assert.deepEqual(p.backend.session.connection.targets, [alias]);
    assert.equal(p.row("Checkout", actor), undefined);
    assert.equal(p.backend.writes.length, 0);
  },
);
test(
  "full popup: restores selection on reopening only for the same actor and organization",
  options,
  async (t) => {
    const backend = fixture();
    let p = await popup(t, backend);
    await p.custom(`${alias},${device}`);
    await p.close();
    p = await popup(t, backend);
    assert.equal(p.$("#mine-label").textContent, "Assigned tests");
    assert.deepEqual(
      [...p.window.document.querySelectorAll(".target-chip > span")].map(
        (x) => x.textContent,
      ),
      [alias, device],
    );
    await p.close();
    backend.org.user = "other-actor@example.com";
    p = await popup(t, backend);
    assert.equal(p.$("#mine-label").textContent, "My tests");
    assert.deepEqual(backend.session.connection.targets, [
      "other-actor@example.com",
    ]);
  },
);
test(
  "full popup: disconnect clears custom IDs and keeps auto-connect paused after reopen",
  options,
  async (t) => {
    const backend = fixture();
    let p = await popup(t, backend);
    await p.custom(alias);
    await p.click("#disconnect");
    assert.equal(backend.session.connection, undefined);
    assert.equal(backend.local.autoConnect, false);
    assert.equal(p.$("#target-input").value, "");
    assert.equal(p.$("#target-value").textContent, "");
    await p.close();
    p = await popup(t, backend);
    assert.equal(p.$("#welcome").hidden, false);
    assert.equal(p.$("#dashboard").hidden, true);
  },
);
test(
  "full popup: changing project keeps IDs and loads only the selected project",
  options,
  async (t) => {
    const p = await popup(t);
    await p.custom(alias);
    p.$("#project").value = "43";
    p.$("#project").dispatchEvent(new p.window.Event("change"));
    await settle();
    assert.equal(p.$("#mine-count").textContent, "1");
    assert.ok(p.row("Production test", alias));
    assert.equal(p.row("Checkout", alias), undefined);
    assert.deepEqual(p.backend.session.connection.targets, [alias]);
  },
);
test(
  "full popup: refresh picks up new assignments and pauses during ID or variant editing",
  options,
  async (t) => {
    const p = await popup(t);
    await p.custom(alias);
    p.backend.flags[1].inclusionsMap.on.push(alias);
    await p.intervals.get(30000)();
    assert.equal(p.$("#mine-count").textContent, "2");
    await p.click("#target-add");
    let requests = p.backend.requests.length;
    await p.intervals.get(30000)();
    assert.equal(p.backend.requests.length, requests);
    await p.click("#target-cancel");
    const select = p.row("Checkout", alias).querySelector("select");
    select.value = "express";
    select.dispatchEvent(new p.window.Event("change"));
    requests = p.backend.requests.length;
    await p.intervals.get(30000)();
    assert.equal(p.backend.requests.length, requests);
  },
);
test(
  "full popup: API failure on target switch leaves no stale editable rows",
  options,
  async (t) => {
    const p = await popup(t);
    p.backend.fail = "403";
    await p.custom(alias);
    assert.match(p.$("#errors").textContent, /HTTP 403/);
    assert.equal(p.window.document.querySelectorAll(".test-card").length, 0);
    p.backend.fail = null;
    await p.click("#refresh");
    assert.ok(p.row("Checkout", alias));
  },
);
test(
  "full popup: actor changes and version conflicts surface errors without writes or retries",
  options,
  async (t) => {
    const p = await popup(t);
    await p.custom(alias);
    p.backend.org.user = "new@example.com";
    await p.change("Checkout", alias, "express");
    assert.match(p.$("#errors").textContent, /Account or organization changed/);
    assert.equal(p.backend.writes.length, 0);
    p.backend.org.user = actor;
    p.backend.fail = "Version conflict";
    const before = p.backend.requests.length;
    await p.change("Checkout", alias, "express");
    assert.match(p.$("#errors").textContent, /Version conflict/);
    assert.equal(p.backend.requests.length, before + 1);
  },
);
test(
  "full popup: unconfirmed writes are not reported as success",
  options,
  async (t) => {
    const p = await popup(t);
    await p.custom(alias);
    p.backend.ignoreWrites = true;
    await p.change("Checkout", alias, "express");
    assert.match(p.$("#errors").textContent, /not confirmed/);
    assert.equal(p.$("#status").hidden, true);
    assert.equal(p.backend.writes.length, 1);
  },
);
test(
  "full popup: server names and custom IDs are rendered as text, not markup",
  options,
  async (t) => {
    const backend = fixture();
    backend.flags[0].name = "<img src=x onerror=alert(1)>";
    const p = await popup(t, backend);
    await p.custom("<svg/onload=alert(1)>");
    await p.click("#explore");
    assert.equal(
      p.$(".target-chip > span").textContent,
      "<svg/onload=alert(1)>",
    );
    assert.equal(p.$("#target-value svg"), null);
    assert.equal(p.$(".card-title img"), null);
    assert.equal(p.$(".card-title").textContent, backend.flags[0].name);
  },
);

test(
  "full popup: add icon keeps actor included by default; chip removal only changes the view",
  options,
  async (t) => {
    const p = await popup(t);
    assert.equal(p.$("#target-include-me").checked, true);
    await p.click("#target-add");
    assert.equal(p.$("#target-add").getAttribute("aria-expanded"), "true");
    assert.equal(p.$("#target-include-me").disabled, true);
    p.$("#target-input").value = `${alias},${device}`;
    await p.click("#target-apply");
    assert.deepEqual(p.backend.session.connection.targets, [
      actor,
      alias,
      device,
    ]);
    assert.equal(p.$("#target-include-me").disabled, false);
    const before = structuredClone(p.backend.flags);
    await p.click(".target-chip button");
    assert.deepEqual(p.backend.session.connection.targets, [actor, device]);
    assert.deepEqual(p.backend.flags, before);
    assert.equal(p.backend.writes.length, 0);
  },
);

test(
  "full popup: empty selection persists across reopen and does not scan or silently use actor",
  options,
  async (t) => {
    const backend = fixture();
    let p = await popup(t, backend);
    const scans = () =>
      backend.requests.filter((r) => r.query.includes("flagConfigsInEnv"))
        .length;
    const before = scans();
    await p.click("#target-include-me");
    assert.equal(scans(), before);
    assert.deepEqual(backend.session.connection.targets, []);
    assert.match(p.$("#empty-title").textContent, /Choose who to test/);
    await p.intervals.get(30000)();
    assert.equal(scans(), before);
    await p.click("#explore");
    assert.equal(p.window.document.querySelectorAll(".test-card").length, 0);
    await p.close();
    p = await popup(t, backend);
    assert.equal(p.$("#target-include-me").checked, false);
    assert.equal(scans(), before);
    await p.click("#target-include-me");
    assert.ok(p.row("Checkout", actor));
  },
);

test(
  "full popup: Include me remains authoritative when actor is pasted in additional IDs",
  options,
  async (t) => {
    const p = await popup(t);
    await p.custom(`${actor},${alias}`, { includeMe: false });
    assert.deepEqual(p.backend.session.connection.targets, [alias]);
    await p.custom(`${actor},${alias}`, { includeMe: true });
    assert.deepEqual(p.backend.session.connection.targets, [actor, alias]);
    await p.custom("", { includeMe: true });
    assert.deepEqual(p.backend.session.connection.targets, [actor]);
    await p.custom("", { includeMe: false });
    assert.deepEqual(p.backend.session.connection.targets, []);
  },
);

test(
  "full popup: 20-ID limit includes actor; rejected toggle preserves selected IDs",
  options,
  async (t) => {
    const p = await popup(t);
    const ids = Array.from({ length: 20 }, (_, i) => `test-${i}`);
    await p.custom(ids.join(","));
    await p.click("#target-include-me");
    assert.equal(p.$("#target-include-me").checked, false);
    assert.deepEqual(p.backend.session.connection.targets, ids);
    assert.match(p.$("#errors").textContent, /20 IDs/);
    await p.click(".target-chip button");
    await p.click("#target-include-me");
    assert.deepEqual(p.backend.session.connection.targets, [
      actor,
      ...ids.slice(1),
    ]);
  },
);

test(
  "full popup: in-flight refresh disables identity controls and prevents stale-scope writes",
  options,
  async (t) => {
    const p = await popup(t);
    await p.custom(alias);
    let release;
    p.backend.waitScan = new Promise((resolve) => {
      release = resolve;
    });
    p.$("#target-include-me").click();
    await settle();
    assert.equal(p.$("#target-add").disabled, true);
    assert.equal(p.$("#target-include-me").disabled, true);
    assert.equal(p.window.document.querySelectorAll(".test-card").length, 0);
    p.$("#target-include-me").click();
    p.$("#target-add").click();
    release();
    await settle();
    assert.deepEqual(p.backend.session.connection.targets, [actor, alias]);
    assert.equal(p.$("#target-add").disabled, false);
    assert.ok(p.row("Checkout", actor));
    assert.ok(p.row("Checkout", alias));
    assert.equal(p.backend.writes.length, 0);
  },
);

test(
  "full popup: ID editing supports Escape, keyboard tabs and dropdowns pause refresh",
  options,
  async (t) => {
    const p = await popup(t);
    await p.click("#target-add");
    p.$("#target-input").value = "discarded-device";
    p.$("#target-input").dispatchEvent(
      new p.window.KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
    );
    assert.equal(p.$("#target-form").hidden, true);
    assert.deepEqual(p.backend.session.connection.targets, [actor]);
    p.$("#mine").dispatchEvent(
      new p.window.KeyboardEvent("keydown", {
        key: "ArrowRight",
        bubbles: true,
      }),
    );
    assert.equal(p.$("#explore").getAttribute("aria-selected"), "true");
    await p.click(".variant-editor .select-trigger");
    const before = p.backend.requests.length;
    await p.intervals.get(30000)();
    assert.equal(p.backend.requests.length, before);
  },
);

test(
  "full popup: exact case-sensitive IDs do not expand aliases or match substrings",
  options,
  async (t) => {
    const p = await popup(t);
    await p.custom(`${alias.toUpperCase()},paytest,${device.toLowerCase()}`);
    assert.equal(p.$("#mine-count").textContent, "0");
    await p.custom(alias);
    assert.equal(p.$("#mine-count").textContent, "1");
    assert.equal(p.backend.writes.length, 0);
  },
);
