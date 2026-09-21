import { parseTargets, restoredTargets } from "./target.js";
import {
  isAutoConnectEnabled,
  setAutoConnectEnabled,
} from "./connection-preferences.js";
import { findReadySession } from "./connection.js";
import {
  initializeTheme,
  getConnection,
  rememberConnection,
  forgetConnection,
} from "./preferences.js";
import { updateSelects, closeSelectMenu, isSelectMenuOpen } from "./select.js";
import {
  extensionAvailable,
  listAmplitudeTabs,
  openAmplitude,
  requestSession,
} from "./bridge.js";
import { createDemo } from "./demo.js";
import {
  element,
  renderCatalog,
  setBusy,
  showAccount,
  showMessage,
} from "./view.js";

const state = {
  account: null,
  tabId: null,
  demo: null,
  catalog: [],
  scope: "mine",
  kind: "all",
  query: "",
  editing: null,
  busy: false,
  autoConnect: true,
  targets: [],
  targetEditing: false,
};

function context() {
  return {
    user: state.account.user,
    orgId: state.account.orgId,
    project: element("project").value,
    targets: state.targets,
  };
}

function render() {
  const ownEmail = state.account?.user;
  const additional = state.targets.filter((target) => target !== ownEmail);
  element("target-include-me").checked = state.targets.includes(ownEmail);
  element("target-include-me").dataset.unavailable = String(
    state.targetEditing,
  );
  element("target-add").setAttribute(
    "aria-expanded",
    String(state.targetEditing),
  );
  element("target-summary").hidden = state.targetEditing || !additional.length;
  element("target-form").hidden = !state.targetEditing;
  element("target-value").replaceChildren(
    ...additional.map((target) => {
      const chip = document.createElement("span");
      chip.className = "target-chip";
      const label = document.createElement("span");
      label.textContent = target;
      label.title = target;
      const remove = document.createElement("button");
      remove.type = "button";
      remove.textContent = "×";
      remove.setAttribute("aria-label", `Stop showing ${target}`);
      remove.title = "Remove from this view; keeps test assignments";
      remove.onclick = () =>
        selectTargets(state.targets.filter((id) => id !== target));
      chip.append(label, remove);
      return chip;
    }),
  );
  renderCatalog(state, {
    edit(id) {
      state.editing = id;
      render();
    },
    change: changeAssignment,
    pending(id) {
      state.editing = id;
    },
  });
}

async function withBusy(message, action) {
  if (state.busy) return;
  state.busy = true;
  setBusy(true);
  showMessage(message);
  try {
    await action();
  } catch (error) {
    showMessage(
      "",
      error.message || "Something went wrong. Refresh and try again.",
    );
  } finally {
    state.busy = false;
    setBusy(false);
  }
}

async function loadCatalog({ silent = false } = {}) {
  if (!silent) {
    state.catalog = [];
    state.editing = null;
    render();
    element("empty").hidden = true;
  }
  if (!state.targets.length) {
    state.catalog = [];
    render();
    if (!state.demo)
      await rememberConnection(state.tabId, element("project").value, {
        user: state.account.user,
        orgId: state.account.orgId,
        targets: [],
      });
    showMessage();
    element("sync-state").textContent = "No testing IDs selected";
    return true;
  }
  if (!element("project").value) {
    showMessage("No projects with deployments are available to this account.");
    return false;
  }
  const data = state.demo
    ? state.demo.scan(element("project").value, state.targets)
    : await requestSession(state.tabId, "scan", context());
  const changed =
    JSON.stringify(state.catalog) !== JSON.stringify(data.catalog);
  state.catalog = data.catalog;
  if (!silent || changed) render();
  if (!state.demo)
    await rememberConnection(state.tabId, element("project").value, {
      user: state.account.user,
      orgId: state.account.orgId,
      targets: state.targets,
    });
  if (data.failures.length) {
    showMessage(
      "",
      `Some items could not be loaded.\n${data.failures.join("\n")}`,
    );
    return false;
  }
  if (!silent || !element("errors").hidden) showMessage();
  element("sync-state").textContent = state.demo ? "Demo data" : "Auto-sync on";
  return true;
}

function displayAccount() {
  state.targets = [state.account.user];
  state.targetEditing = false;
  element("target-input").value = "";
  element("target-error").hidden = true;
  state.scope = "mine";
  state.kind = "all";
  state.query = "";
  showAccount(state.account, Boolean(state.demo));
}

async function changeAssignment(item, key, target) {
  if (state.targetEditing) return;
  await withBusy("Saving… Keep this window open.", async () => {
    if (state.demo)
      state.demo.change(element("project").value, item.id, key, target);
    else {
      await requestSession(state.tabId, key === null ? "remove" : "assign", {
        ...context(),
        id: item.id,
        target,
        ...(key === null ? {} : { variant: key }),
      });
    }
    const loaded = await loadCatalog();
    if (loaded)
      showMessage(
        key === null
          ? `Removed ${target} from ${item.name}.`
          : `Saved ${target} in ${item.name}.`,
      );
  });
}

async function disconnect() {
  if (state.busy) return;
  state.autoConnect = false;
  closeSelectMenu();
  await withBusy("Disconnecting…", async () => {
    await setAutoConnectEnabled(false);
    await forgetConnection();
    state.account = null;
    state.tabId = null;
    state.demo = null;
    state.catalog = [];
    state.editing = null;
    state.targets = [];
    state.targetEditing = false;
    element("target-input").value = "";
    element("target-value").textContent = "";
    element("results").replaceChildren();
    element("account-email").textContent = "";
    element("organization").textContent = "";
    element("project").replaceChildren();
    element("dashboard").hidden = true;
    element("demo-banner").hidden = true;
    element("disconnect").hidden = true;
    element("welcome").hidden = false;
    element("sync-state").textContent = "Disconnected";
    element("connection-note").textContent = "Automatic connection is paused.";
    showMessage(
      "Disconnected from TestPerch. Your Amplitude sign-in is unchanged.",
    );
  });
}

function setScope(scope) {
  state.scope = scope;
  state.editing = null;
  render();
}

async function connectSession(tabId, saved) {
  state.tabId = tabId;
  state.demo = null;
  state.account = await requestSession(tabId, "connect");
  displayAccount();
  state.targets = restoredTargets(saved, state.account);
  if (saved && state.account.projects.some((p) => p.id === saved.project))
    element("project").value = saved.project;
  updateSelects();
  await loadCatalog();
  if (state.account.failures.length)
    showMessage(
      "",
      `Some projects are unavailable.\n${state.account.failures.join("\n")}`,
    );
}

function editTarget() {
  if (state.busy) return;
  state.targetEditing = true;
  state.editing = null;
  element("target-input").value = state.targets
    .filter((target) => target !== state.account.user)
    .join("\n");
  element("target-error").hidden = true;
  element("target-input").removeAttribute("aria-invalid");
  showMessage();
  render();
  element("target-input").focus();
}

async function selectTargets(targets) {
  await withBusy("Loading assignments for selected IDs…", async () => {
    state.targets = targets;
    state.targetEditing = false;
    state.query = "";
    element("search").value = "";
    await loadCatalog();
  });
}

element("target-add").onclick = editTarget;
element("target-include-me").onchange = () => {
  const additional = state.targets.filter(
    (target) => target !== state.account.user,
  );
  const targets = element("target-include-me").checked
    ? [state.account.user, ...additional]
    : additional;
  try {
    if (targets.length) parseTargets(targets.join("\n"));
    selectTargets(targets);
  } catch (error) {
    render();
    showMessage("", error.message);
  }
};
element("target-cancel").onclick = () => {
  state.targetEditing = false;
  element("target-input").value = "";
  render();
};
element("target-form").onsubmit = (event) => {
  event.preventDefault();
  try {
    const value = element("target-input").value;
    const additional = value.trim() ? parseTargets(value) : [];
    const includesMe = state.targets.includes(state.account.user);
    // The account switch controls the signed-in email, even when pasted again.
    const targets = [
      ...new Set([
        ...(includesMe ? [state.account.user] : []),
        ...additional.filter((target) => target !== state.account.user),
      ]),
    ];
    if (targets.length) parseTargets(targets.join("\n"));
    element("target-error").hidden = true;
    element("target-input").removeAttribute("aria-invalid");
    selectTargets(targets);
  } catch (error) {
    element("target-error").textContent = error.message;
    element("target-error").hidden = false;
    element("target-input").setAttribute("aria-invalid", "true");
    element("target-input").focus();
  }
};
element("target-input").onkeydown = (event) => {
  if (event.key === "Escape") {
    event.preventDefault();
    element("target-cancel").click();
  }
};

element("connect").onclick = () => {
  withBusy("Connecting to Amplitude…", async () => {
    await setAutoConnectEnabled(true);
    state.autoConnect = true;
    const tabId = Number(element("tab").value);
    const probe = await requestSession(tabId, "probe");
    if (!probe.ready) {
      showMessage(
        probe.signedIn
          ? "Open Experiment in Amplitude and wait for it to load."
          : "Sign in to Amplitude, then reopen TestPerch. We'll connect automatically.",
      );
      return;
    }
    await connectSession(tabId, await getConnection());
  });
};

element("demo").onclick = () =>
  withBusy("", async () => {
    state.demo = createDemo();
    state.account = state.demo.account;
    displayAccount();
    await loadCatalog();
  });
element("disconnect").onclick = disconnect;
element("exit-demo").onclick = disconnect;
element("open").onclick = () =>
  withBusy("Opening Amplitude…", async () => {
    await setAutoConnectEnabled(true);
    state.autoConnect = true;
    await openAmplitude();
    showMessage();
  });
element("mine").onclick = () => setScope("mine");
element("explore").onclick = () => setScope("all");
element("browse").onclick = () => setScope("all");
element("refresh").onclick = () =>
  withBusy("Refreshing your tests…", () => loadCatalog());
element("project").onchange = () => {
  state.query = "";
  element("search").value = "";
  withBusy("Loading this project…", () => loadCatalog());
};
element("kind").onchange = () => {
  state.kind = element("kind").value;
  state.editing = null;
  render();
};
element("search").oninput = () => {
  state.query = element("search").value;
  state.editing = null;
  render();
};
// Native buttons retain normal Tab navigation; arrows also switch between tabs.
for (const id of ["mine", "explore"]) {
  element(id).onkeydown = (event) => {
    if (!["ArrowLeft", "ArrowRight"].includes(event.key)) return;
    event.preventDefault();
    const target = id === "mine" ? "explore" : "mine";
    setScope(target === "mine" ? "mine" : "all");
    element(target).focus();
  };
}

function renderTabs(tabs) {
  const selected = element("tab").value;
  element("tab").replaceChildren(
    ...tabs.map((tab) => new Option(tab.title || "Amplitude", String(tab.id))),
  );
  if (!tabs.length)
    element("tab").append(
      new Option(
        extensionAvailable
          ? "Sign in to Amplitude to get started"
          : "Install the extension to connect",
        "",
      ),
    );
  else if (tabs.some((tab) => String(tab.id) === selected))
    element("tab").value = selected;
  element("connect").dataset.unavailable = String(!tabs.length);
  updateSelects();
}

async function tryAutoConnect() {
  if (
    !extensionAvailable ||
    !state.autoConnect ||
    state.account ||
    state.demo ||
    state.busy ||
    document.hidden ||
    isSelectMenuOpen()
  )
    return;
  state.busy = true;
  try {
    const tabs = await listAmplitudeTabs();
    renderTabs(tabs);
    const saved = await getConnection();
    const tabId = await findReadySession(tabs, saved, requestSession);
    if (tabId === null) return;
    setBusy(true);
    showMessage("Syncing your tests…");
    await connectSession(tabId, saved);
  } catch (error) {
    // Do not repeatedly retry permission/API errors; the user can retry explicitly.
    state.autoConnect = false;
    showMessage("", error.message);
  } finally {
    state.busy = false;
    setBusy(false);
  }
}

async function initialize() {
  await initializeTheme();
  state.autoConnect = await isAutoConnectEnabled();
  renderTabs(await listAmplitudeTabs());
  setBusy(false);
  if (state.autoConnect) await tryAutoConnect();
  else {
    element("sync-state").textContent = "Disconnected";
    element("connection-note").textContent = "Automatic connection is paused.";
    showMessage(
      "Auto-connect is paused. Choose Check connection to reconnect.",
    );
  }
}
initialize().catch((error) => showMessage("", error.message));

// Poll only while the popup is visible. Never interrupt a variant being edited.
async function autoRefresh() {
  if (
    !state.account ||
    state.demo ||
    state.busy ||
    state.editing ||
    state.targetEditing ||
    isSelectMenuOpen() ||
    document.hidden
  )
    return;
  state.busy = true;
  setBusy(true);
  try {
    await loadCatalog({ silent: true });
  } catch (error) {
    element("sync-state").textContent = "Sync paused";
    showMessage("", `Could not refresh. ${error.message}`);
  } finally {
    state.busy = false;
    setBusy(false);
  }
}
setInterval(autoRefresh, 30000);
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) autoRefresh();
});

// Lightweight sign-in readiness checks only while this window is open.
setInterval(tryAutoConnect, 5000);
window.addEventListener("focus", tryAutoConnect);
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) tryAutoConnect();
});
