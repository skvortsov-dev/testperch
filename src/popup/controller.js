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
  getCatalogSnapshot,
  rememberCatalogSnapshot,
  forgetCatalogSnapshot,
} from "../cache.js";
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
  live: false,
  cachedAt: null,
  forceRefresh: false,
  needsSignIn: false,
};
const FRESH_SNAPSHOT_MS = 5 * 60 * 1000;

function context() {
  return {
    user: state.account.user,
    orgId: state.account.orgId,
    project: element("project").value,
    targets: state.targets,
  };
}

function renderTargets() {
  const ownEmail = state.account?.user;
  const additional = state.targets.filter((target) => target !== ownEmail);
  const readOnly = !state.demo && !state.live;
  for (const id of [
    "target-add",
    "target-summary",
    "target-include-me",
    "target-input",
    "target-apply",
    "project",
  ])
    element(id).dataset.unavailable = String(readOnly);
  element("target-picker").hidden =
    additional.length === 0 || state.targetEditing;
  element("target-include-me").checked = state.targets.includes(ownEmail);

  element("target-add").setAttribute(
    "aria-expanded",
    String(state.targetEditing),
  );
  element("target-summary").hidden = !additional.length;
  element("target-summary").textContent =
    `${additional.length} additional ${additional.length === 1 ? "ID" : "IDs"}`;
  element("target-count").textContent =
    `${state.targets.length} of 20 selected${state.targets.includes(ownEmail) ? " · including you" : ""}`;
  element("target-panel").hidden = !state.targetEditing;
  element("target-footnote").hidden = additional.length === 0;
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
}

function render() {
  renderTargets();
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

async function loadCatalog({ silent = false, clear = false } = {}) {
  if (!silent) {
    if (clear) state.catalog = [];
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
    if (!state.demo) await saveSnapshot();
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
  if (!state.demo) await saveSnapshot();
  if (data.failures.length) {
    showMessage(
      "",
      `Some items could not be loaded.\n${data.failures.join("\n")}`,
    );
    return false;
  }
  if (!silent || !element("errors").hidden) showMessage();
  element("sync-state").textContent = state.demo ? "Demo data" : "Auto-sync on";
  element("reconnect").hidden = true;
  state.forceRefresh = false;
  state.needsSignIn = false;
  return true;
}

async function saveSnapshot() {
  const updatedAt = Date.now();
  try {
    await persistSnapshot(updatedAt);
    state.cachedAt = updatedAt;
  } catch {
    // Session storage is a performance optimization. A quota or browser
    // storage failure must not turn a successful Amplitude read into an error.
  }
}

async function persistSnapshot(updatedAt) {
  await rememberCatalogSnapshot({
    tabId: state.tabId,
    account: state.account,
    project: element("project").value,
    targets: state.targets,
    catalog: state.catalog,
    updatedAt,
  });
}

function cacheAge(updatedAt) {
  const minutes = Math.max(0, Math.floor((Date.now() - updatedAt) / 60000));
  if (minutes < 1) return "just now";
  if (minutes === 1) return "1 min ago";
  return `${minutes} min ago`;
}

async function restoreSnapshot() {
  const snapshot = await getCatalogSnapshot();
  if (!snapshot) return false;
  state.account = snapshot.account;
  state.tabId = snapshot.tabId;
  state.catalog = snapshot.catalog;
  state.targets = snapshot.targets;
  state.cachedAt = snapshot.updatedAt;
  state.live = false;
  state.forceRefresh = false;
  state.needsSignIn = false;
  state.scope = "mine";
  state.kind = "all";
  state.query = "";
  showAccount(state.account, false);
  if (state.account.projects.some((project) => project.id === snapshot.project))
    element("project").value = snapshot.project;
  updateSelects();
  render();
  element("sync-state").textContent = `Last synced ${cacheAge(snapshot.updatedAt)}`;
  return true;
}

function showReconnect(
  message = "Amplitude session unavailable.",
  { forceRefresh = false, needsSignIn = false } = {},
) {
  state.live = false;
  state.forceRefresh ||= forceRefresh;
  state.needsSignIn = needsSignIn;
  const reconnect = element("reconnect");
  reconnect.hidden = false;
  reconnect.textContent = needsSignIn
    ? "Sign in to Amplitude ↗"
    : "Reconnect";
  reconnect.title = needsSignIn
    ? "Open Amplitude to sign in"
    : "Retry the Amplitude connection";
  reconnect.setAttribute("aria-label", reconnect.title);
  element("sync-state").textContent = state.cachedAt
    ? `Last synced ${cacheAge(state.cachedAt)}`
    : "Sync paused";
  showMessage(
    "",
    `${message} ${
      needsSignIn
        ? "Open Amplitude to sign in, then reopen TestPerch."
        : "Choose Reconnect to try again."
    }`,
  );
  if (state.account) render();
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
  if (!state.demo && !state.live) {
    showReconnect("Reconnect before changing a testing assignment.");
    return;
  }
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
    await forgetCatalogSnapshot();
    state.account = null;
    state.tabId = null;
    state.demo = null;
    state.catalog = [];
    state.editing = null;
    state.targets = [];
    state.targetEditing = false;
    state.live = false;
    state.cachedAt = null;
    state.forceRefresh = false;
    state.needsSignIn = false;
    element("target-input").value = "";
    element("target-value").textContent = "";
    element("results").replaceChildren();
    element("account-email").textContent = "";
    element("organization").textContent = "";
    element("project").replaceChildren();
    element("dashboard").hidden = true;
    element("demo-banner").hidden = true;
    element("testing-help").hidden = true;
    element("disconnect").hidden = true;
    element("reconnect").hidden = true;
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

async function connectSession(tabId, saved, { preserveCatalog = false } = {}) {
  state.tabId = tabId;
  state.demo = null;
  const previous = state.account;
  const account = await requestSession(tabId, "connect");
  const sameAccount =
    previous?.user === account.user &&
    String(previous?.orgId) === String(account.orgId);
  state.account = account;
  if (!preserveCatalog || !sameAccount) {
    state.catalog = [];
    displayAccount();
  } else showAccount(state.account, false);
  state.targets = restoredTargets(saved, state.account);
  if (saved && state.account.projects.some((p) => p.id === saved.project))
    element("project").value = saved.project;
  updateSelects();
  state.live = true;
  try {
    await loadCatalog({ silent: preserveCatalog && sameAccount });
  } catch (error) {
    state.live = false;
    render();
    throw error;
  }
  // A successful refresh can return the same catalog. Re-render anyway so a
  // restored read-only snapshot becomes interactive only after verification.
  if (preserveCatalog && sameAccount) render();
  if (state.account.failures.length)
    showMessage(
      "",
      `Some projects are unavailable.\n${state.account.failures.join("\n")}`,
    );
}

function editTarget() {
  if (state.busy) return;
  state.targetEditing = true;
  element("target-input").value = "";
  element("target-error").hidden = true;
  element("target-input").removeAttribute("aria-invalid");
  showMessage();
  closeSelectMenu();
  renderTargets();
  element("target-input").focus();
}

async function selectTargets(targets) {
  await withBusy("Loading assignments for selected IDs…", async () => {
    state.targets = targets.length ? targets : [state.account.user];
    state.query = "";
    element("search").value = "";
    await loadCatalog({ clear: true });
  });
}

element("target-add").onclick = () =>
  state.targetEditing ? closeTargets() : editTarget();
element("target-summary").onclick = editTarget;
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
function closeTargets() {
  state.targetEditing = false;
  element("target-input").value = "";
  element("target-error").hidden = true;
  renderTargets();
  element("target-add").focus();
}
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && state.targetEditing) {
    event.preventDefault();
    closeTargets();
  }
});
document.addEventListener("click", (event) => {
  if (
    state.targetEditing &&
    !state.busy &&
    !event.composedPath().includes(element("target-panel")) &&
    !element("target-add").contains(event.target) &&
    !element("target-summary").contains(event.target) &&
    !event.target.closest(".include-me")
  )
    closeTargets();
});
element("target-form").onsubmit = async (event) => {
  event.preventDefault();
  if (state.busy) return;
  try {
    // Additive input: Enter adds one ID, pasted comma/newline lists also work.
    const additional = parseTargets(element("target-input").value);
    const newIds = additional.filter(
      (target) =>
        target !== state.account.user && !state.targets.includes(target),
    );
    if (!newIds.length)
      throw Error(
        additional.includes(state.account.user)
          ? state.targets.includes(state.account.user)
            ? "Your account is already included. Add a different email or device ID."
            : "Use Include me to show your own account."
          : "This ID is already in your list.",
      );
    const targets = parseTargets([...state.targets, ...newIds].join("\n"));
    element("target-error").hidden = true;
    element("target-input").removeAttribute("aria-invalid");
    await selectTargets(targets);
    element("target-input").value = "";
    element("target-input").focus();
  } catch (error) {
    element("target-error").textContent = error.message;
    element("target-error").hidden = false;
    element("target-input").setAttribute("aria-invalid", "true");
    element("target-input").focus();
  }
};
element("target-input").onpaste = (event) => {
  const pasted = event.clipboardData?.getData("text");
  if (pasted && /[\r\n]/.test(pasted)) {
    event.preventDefault();
    const input = element("target-input");
    input.setRangeText(
      pasted.replace(/[\r\n]+/g, ","),
      input.selectionStart,
      input.selectionEnd,
      "end",
    );
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
    state.live = true;
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
async function refreshCatalog() {
  try {
    await loadCatalog();
  } catch (error) {
    showReconnect(`Could not refresh. ${error.message}`, {
      forceRefresh: true,
    });
  }
}
element("refresh").onclick = () =>
  state.live
    ? withBusy("Refreshing your tests…", refreshCatalog)
    : reconnect();
element("project").onchange = () => {
  state.query = "";
  element("search").value = "";
  withBusy("Loading this project…", () => loadCatalog({ clear: true }));
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
    state.live ||
    state.demo ||
    state.busy ||
    document.hidden ||
    isSelectMenuOpen()
  )
    return false;
  const preserving = Boolean(state.account);
  state.busy = true;
  try {
    const tabs = await listAmplitudeTabs();
    renderTabs(tabs);
    const saved = await getConnection();
    const tabId = await findReadySession(tabs, saved, requestSession);
    if (tabId === null) {
      if (preserving) showReconnect(undefined, { needsSignIn: true });
      return false;
    }
    if (
      preserving &&
      state.cachedAt &&
      !state.forceRefresh &&
      Date.now() - state.cachedAt < FRESH_SNAPSHOT_MS
    ) {
      const probe = await requestSession(tabId, "probe");
      if (
        probe.ready &&
        probe.user === state.account.user &&
        String(probe.orgId) === String(state.account.orgId)
      ) {
        state.tabId = tabId;
        state.live = true;
        state.forceRefresh = false;
        state.needsSignIn = false;
        await rememberConnection(tabId, element("project").value, {
          user: state.account.user,
          orgId: state.account.orgId,
          targets: state.targets,
        });
        try {
          await persistSnapshot(state.cachedAt);
        } catch {
          /* The live session remains usable without the optimization. */
        }
        element("reconnect").hidden = true;
        element("sync-state").textContent = "Auto-sync on";
        showMessage();
        render();
        return true;
      }
    }
    if (!preserving) {
      setBusy(true);
      showMessage("Syncing your tests…");
    } else element("sync-state").textContent = "Updating…";
    await connectSession(tabId, saved, { preserveCatalog: preserving });
    return true;
  } catch (error) {
    if (preserving) showReconnect(error.message);
    else showMessage("", error.message);
    return false;
  } finally {
    state.busy = false;
    setBusy(false);
  }
}

async function reconnect() {
  if (state.busy) return;
  await setAutoConnectEnabled(true);
  state.autoConnect = true;
  const connected = await tryAutoConnect();
  if (!connected && state.needsSignIn) await openAmplitude();
}

element("reconnect").onclick = reconnect;

async function initialize() {
  await initializeTheme();
  state.autoConnect = await isAutoConnectEnabled();
  if (state.autoConnect) await restoreSnapshot();
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

// Poll only while the panel is visible. Never interrupt a variant being edited.
async function autoRefresh() {
  if (
    !state.account ||
    !state.live ||
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
    showReconnect(`Could not refresh. ${error.message}`, {
      forceRefresh: true,
    });
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
