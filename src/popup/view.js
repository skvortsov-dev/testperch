import { updateSelects, closeSelectMenu } from "./select.js";
import { assignmentCount, filterCatalog, isExperiment } from "./model.js";

export const element = (id) => document.getElementById(id);

export function showMessage(message = "", error = "") {
  element("status").textContent = message;
  element("status").hidden = !message;
  element("errors").textContent = error;
  element("errors").hidden = !error;
}

export function setBusy(busy) {
  document.querySelectorAll("button, select, input").forEach((control) => {
    control.disabled = busy || control.dataset.unavailable === "true";
  });
  element("catalog").setAttribute("aria-busy", String(busy));
  updateSelects();
}

export function showAccount(account, demo) {
  element("welcome").hidden = true;
  element("dashboard").hidden = false;
  element("disconnect").hidden = false;
  element("demo-banner").hidden = !demo;
  element("account-email").textContent = account.user;
  element("organization").textContent = account.orgUrl;
  element("avatar").textContent = account.user.slice(0, 1).toUpperCase();
  element("project").replaceChildren(
    ...account.projects.map((project) => new Option(project.name, project.id)),
  );
  element("search").value = "";
  element("kind").value = "all";
}

/** Server-provided names are always rendered as text, never HTML. */
export function renderCatalog(state, handlers) {
  closeSelectMenu();
  const scrollTop = element("catalog").scrollTop;
  const items = filterCatalog(state.catalog, state);
  element("mine-count").textContent = assignmentCount(state.catalog);
  element("mine").setAttribute("aria-selected", String(state.scope === "mine"));
  element("explore").setAttribute(
    "aria-selected",
    String(state.scope === "all"),
  );
  element("catalog").setAttribute(
    "aria-labelledby",
    state.scope === "mine" ? "mine" : "explore",
  );
  element("list-description").textContent =
    state.scope === "mine"
      ? "Your manual test assignments"
      : "Find an experiment or flag to join";
  element("result-count").textContent =
    `${items.length} ${items.length === 1 ? "result" : "results"}`;
  element("results").replaceChildren();
  element("empty").hidden = items.length > 0;
  const filtered = state.query.trim() || state.kind !== "all";
  element("empty-title").textContent = filtered
    ? "No matches"
    : state.scope === "mine"
      ? "You’re all clear"
      : "Nothing here yet";
  element("empty-description").textContent = filtered
    ? "Try a different name, key, or type."
    : state.scope === "mine"
      ? "No manual assignments in this project. Find an experiment to try."
      : "Choose another project to find experiments and flags.";
  element("browse").hidden = state.scope !== "mine";
  element("browse").textContent = filtered
    ? "Search all tests"
    : "Find a test to join";
  if (filtered && state.scope === "mine")
    element("empty-description").textContent =
      "No matching assignments. Search all experiments and flags in this project.";

  for (const item of items) {
    const card =
      element("card-template").content.firstElementChild.cloneNode(true);
    const assigned = item.variants.length > 0;
    const experiment = isExperiment(item);
    card.querySelector(".type-icon").textContent = experiment ? "A/B" : "⚑";
    const title = card.querySelector(".card-title");
    title.textContent = item.name;
    title.title = item.key || item.name;
    card.querySelector(".card-meta").textContent = [
      experiment ? "Experiment" : "Feature flag",
      ...item.deployments,
    ].join(" · ");
    const leave = card.querySelector(".leave-button");
    leave.hidden = !assigned;
    leave.setAttribute("aria-label", `Leave ${item.name}`);
    leave.onclick = () => handlers.change(item, null);

    const form = card.querySelector("form");
    const select = card.querySelector(".variant-select");
    select.setAttribute("aria-label", `Test variant for ${item.name}`);
    select.append(
      new Option("Choose a test variant…", ""),
      ...item.availableVariants.map((v) => new Option(v.name, v.key)),
    );
    select.value =
      assigned && item.variants.length === 1 ? item.variants[0].key : "";
    const save = card.querySelector(".save-button");
    save.textContent = assigned ? "Apply variant" : "Add me to test";
    function updateSave() {
      const unchanged =
        item.variants.length === 1 && item.variants[0].key === select.value;
      save.dataset.unavailable = String(!select.value || unchanged);
      save.disabled = state.busy || save.dataset.unavailable === "true";
      card.querySelector(".editor-actions").hidden = !select.value || unchanged;
      card.classList.toggle("pending", Boolean(select.value) && !unchanged);
      card.classList.toggle("assigned", assigned);
    }
    updateSave();
    select.onchange = () => {
      updateSave();
      handlers.pending(
        element("results").querySelector(".pending") ? "pending" : null,
      );
    };
    form.onsubmit = (event) => {
      event.preventDefault();
      if (!save.disabled) handlers.change(item, select.value);
    };
    card.querySelector(".cancel-button").onclick = () => handlers.edit(null);
    element("results").append(card);
  }
  setBusy(state.busy);
  element("catalog").scrollTop = scrollTop;
}
