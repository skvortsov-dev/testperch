/** Rounded, keyboard-accessible select menus. Native selects remain the data source. */
const widgets = new WeakMap();
let opened = null;
export const isSelectMenuOpen = () => Boolean(opened);

export function closeSelectMenu() {
  if (!opened) return;
  opened.button.setAttribute("aria-expanded", "false");
  opened.menu.remove();
  opened = null;
}

document.addEventListener("pointerdown", (event) => {
  if (
    opened &&
    !opened.menu.contains(event.target) &&
    !opened.button.contains(event.target)
  )
    closeSelectMenu();
});
window.addEventListener("resize", closeSelectMenu);
document.addEventListener(
  "scroll",
  (event) => {
    if (opened && !opened.menu.contains(event.target)) closeSelectMenu();
  },
  true,
);

export function enhanceSelect(select) {
  if (!widgets.has(select)) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `select-trigger ${select.id === "kind" ? "type-trigger" : ""}`;
    button.setAttribute("aria-haspopup", "listbox");
    button.setAttribute("aria-expanded", "false");
    select.classList.add("native-select");
    select.tabIndex = -1;
    select.setAttribute("aria-hidden", "true");
    select.after(button);
    widgets.set(select, button);
    button.onclick = () => openMenu(select, button);
    button.onkeydown = (event) => {
      if (["ArrowDown", "ArrowUp"].includes(event.key)) {
        event.preventDefault();
        openMenu(select, button);
      }
    };
  }
  const button = widgets.get(select);
  button.textContent = select.selectedOptions[0]?.textContent || "Choose…";
  button.disabled = select.disabled;
  button.setAttribute(
    "aria-label",
    `${select.getAttribute("aria-label") || select.labels?.[0]?.textContent?.trim() || "Select"}: ${button.textContent}`,
  );
}

export function updateSelects() {
  document.querySelectorAll("select").forEach(enhanceSelect);
}

function openMenu(select, button) {
  if (select.disabled) return;
  if (opened?.button === button) {
    closeSelectMenu();
    return;
  }
  closeSelectMenu();
  const menu = document.createElement("div");
  menu.className = "select-menu";
  menu.setAttribute("role", "listbox");
  menu.setAttribute("aria-label", button.getAttribute("aria-label"));
  const choices = [];
  for (const option of select.options) {
    const choice = document.createElement("button");
    choice.type = "button";
    choice.className = "select-option";
    choice.textContent = option.textContent;
    choice.setAttribute("role", "option");
    choice.setAttribute("aria-selected", String(option.selected));
    choice.disabled = option.disabled;
    choice.onclick = () => {
      select.value = option.value;
      closeSelectMenu();
      enhanceSelect(select);
      button.focus();
      select.dispatchEvent(new Event("change", { bubbles: true }));
    };
    menu.append(choice);
    choices.push(choice);
  }
  opened = { button, menu };
  button.setAttribute("aria-expanded", "true");
  document.body.append(menu);
  const rect = button.getBoundingClientRect();
  const below = window.innerHeight - rect.bottom - 10;
  const above = rect.top - 10;
  const upward = below < 150 && above > below;
  Object.assign(menu.style, {
    left: `${Math.max(6, Math.min(rect.left, window.innerWidth - rect.width - 6))}px`,
    width: `${rect.width}px`,
    maxHeight: `${Math.max(70, Math.min(240, upward ? above : below))}px`,
    ...(upward
      ? { bottom: `${window.innerHeight - rect.top + 5}px` }
      : { top: `${rect.bottom + 5}px` }),
  });
  const enabled = choices.filter((choice) => !choice.disabled);
  let current = Math.max(
    0,
    enabled.findIndex(
      (choice) => choice.getAttribute("aria-selected") === "true",
    ),
  );
  enabled[current]?.focus();
  menu.onkeydown = (event) => {
    if (event.key === "Escape" || event.key === "Tab") {
      if (event.key === "Escape") event.preventDefault();
      closeSelectMenu();
      button.focus();
      return;
    }
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    current =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? enabled.length - 1
          : (current + (event.key === "ArrowDown" ? 1 : -1) + enabled.length) %
            enabled.length;
    enabled[current]?.focus();
  };
}
