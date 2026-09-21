import { isCustomTarget } from "./target.js";
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
  document
    .querySelectorAll("button, select, input, textarea")
    .forEach((control) => {
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
  const custom = isCustomTarget(state.targets, state.account?.user);
  const items = !state.targets.length
    ? []
    : filterCatalog(state.catalog, state);
  element("mine-label").textContent = custom ? "Assigned tests" : "My tests";
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
      ? custom
        ? "Assignments for selected IDs"
        : "Your manual test assignments"
      : "Find an experiment or flag to test";
  element("result-count").textContent =
    `${items.length} ${items.length === 1 ? "result" : "results"}`;
  element("results").replaceChildren();
  element("empty").hidden = items.length > 0;
  const filtered = state.query.trim() || state.kind !== "all";
  element("empty-title").textContent = filtered
    ? "No matches"
    : state.scope === "mine"
      ? custom
        ? "No assignments for these IDs"
        : "You’re all clear"
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

  if (!state.targets.length) {
    element("empty-title").textContent = "Choose who to test";
    element("empty-description").textContent =
      "Include your account or add an email or device ID next to your profile.";
    element("browse").hidden = true;
  }

  for (const item of items) {
    const card =
      element("card-template").content.firstElementChild.cloneNode(true);
    const experiment = isExperiment(item);
    card.querySelector(".type-icon").textContent = experiment ? "A/B" : "⚑";
    const title = card.querySelector(".card-title");
    title.textContent = item.name;
    title.title = item.key || item.name;
    card.querySelector(".card-meta").textContent = [
      experiment ? "Experiment" : "Feature flag",
      ...item.deployments,
    ].join(" · ");
    const formTemplate = card.querySelector("form");
    formTemplate.remove();
    for (const membership of item.memberships) {
      const { target, variants } = membership;
      const assigned = variants.length > 0;
      // My/Assigned tests shows only memberships; Find tests also offers unassigned IDs.
      if (state.scope === "mine" && !assigned) continue;
      const form = formTemplate.cloneNode(true);
      const targetLabel = form.querySelector(".assignment-target");
      targetLabel.hidden = !custom;
      targetLabel.textContent = target;
      const leave = form.querySelector(".leave-button");
      leave.hidden = !assigned;
      leave.setAttribute("aria-label", `Remove ${target} from ${item.name}`);
      leave.title = `Remove only ${target} from this test`;
      leave.onclick = () => handlers.change(item, null, target);
      const select = form.querySelector(".variant-select");
      select.setAttribute(
        "aria-label",
        `Test variant for ${item.name}, ${target}`,
      );
      select.append(
        new Option("Choose a test variant…", ""),
        ...item.availableVariants.map((v) => new Option(v.name, v.key)),
      );
      select.value = assigned && variants.length === 1 ? variants[0].key : "";
      const save = form.querySelector(".save-button");
      save.textContent = assigned
        ? "Apply variant"
        : custom
          ? "Add to test"
          : "Add me to test";
      save.title = `Assign only ${target} to the selected variant`;
      const note = form.querySelector(".editor-note");
      note.textContent = custom ? "Only this ID" : "Only your assignment";
      function updateSave() {
        const unchanged =
          variants.length === 1 && variants[0].key === select.value;
        save.dataset.unavailable = String(!select.value || unchanged);
        save.disabled = state.busy || save.dataset.unavailable === "true";
        form.querySelector(".editor-actions").hidden =
          !select.value || unchanged;
        form.classList.toggle("pending", Boolean(select.value) && !unchanged);
        form.classList.toggle("assigned", assigned);
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
        if (!save.disabled) handlers.change(item, select.value, target);
      };
      form.querySelector(".cancel-button").onclick = () => handlers.edit(null);
      card.append(form);
    }
    element("results").append(card);
  }
  setBusy(state.busy);
  element("catalog").scrollTop = scrollTop;
}
