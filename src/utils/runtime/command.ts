import { trapFocus, generateId } from "@/utils/focus-trap";

export function initCommands() {
  document.querySelectorAll("[data-command]").forEach((command) => {
    if (command.hasAttribute("data-command-initialized")) return;
    command.setAttribute("data-command-initialized", "true");

    const input = command.querySelector("[data-command-input]") as
      | HTMLInputElement
      | null;
    const list = command.querySelector("[data-command-list]") as
      | HTMLElement
      | null;
    const empty = command.querySelector("[data-command-empty]") as
      | HTMLElement
      | null;
    const items = Array.from(
      command.querySelectorAll("[data-command-item]")
    ) as HTMLElement[];
    const groups = command.querySelectorAll("[data-command-group]");

    if (list && !list.id) {
      list.id = generateId("command-list");
    }

    items.forEach((item, index) => {
      if (!item.id) {
        item.id = generateId(`command-item-${index}`);
      }
    });

    if (input && list) {
      input.setAttribute("aria-controls", list.id);
    }

    let selectedIndex = -1;

    const updateSelection = () => {
      const visibleItems = items.filter((item) => !item.hidden);

      visibleItems.forEach((item, index) => {
        if (index === selectedIndex) {
          item.setAttribute("data-selected", "true");
          item.setAttribute("aria-selected", "true");
          item.scrollIntoView({ block: "nearest" });
          if (input) {
            input.setAttribute("aria-activedescendant", item.id);
          }
        } else {
          item.removeAttribute("data-selected");
          item.setAttribute("aria-selected", "false");
        }
      });

      if (selectedIndex === -1 && input) {
        input.removeAttribute("aria-activedescendant");
      }
    };

    const filterItems = () => {
      if (!input) return;

      const query = input.value.toLowerCase().trim();
      let visibleCount = 0;

      items.forEach((item) => {
        const text = item.textContent?.toLowerCase() || "";
        const matches = query === "" || text.includes(query);
        item.hidden = !matches;
        if (matches) visibleCount += 1;
      });

      groups.forEach((group) => {
        const groupItems = group.querySelectorAll("[data-command-item]");
        const hasVisibleItems = Array.from(groupItems).some(
          (item) => !(item as HTMLElement).hidden
        );
        (group as HTMLElement).hidden = !hasVisibleItems;
      });

      if (empty) {
        empty.hidden = visibleCount > 0 || query === "";
      }

      selectedIndex = -1;
      updateSelection();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      const visibleItems = items.filter((item) => !item.hidden);
      if (visibleItems.length === 0) return;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          selectedIndex = Math.min(selectedIndex + 1, visibleItems.length - 1);
          updateSelection();
          break;
        case "ArrowUp":
          e.preventDefault();
          selectedIndex = Math.max(selectedIndex - 1, 0);
          updateSelection();
          break;
        case "Enter":
          e.preventDefault();
          if (selectedIndex >= 0 && visibleItems[selectedIndex]) {
            visibleItems[selectedIndex].click();
          }
          break;
        case "Escape":
          input?.blur();
          break;
      }
    };

    if (input) {
      input.addEventListener("input", filterItems);
      input.addEventListener("keydown", handleKeyDown);
    }

    items.forEach((item) => {
      item.addEventListener("click", () => {
        const value = item.getAttribute("data-value") || item.textContent;
        command.dispatchEvent(
          new CustomEvent("command-select", {
            detail: { value },
            bubbles: true,
          })
        );
      });
    });
  });
}

const commandDialogFocusTraps = new WeakMap<Element, () => void>();

function getCommandDialogParts(dialog: Element) {
  return {
    trigger: dialog.querySelector(
      "[data-command-dialog-trigger]"
    ) as HTMLElement | null,
    overlay: dialog.querySelector(
      "[data-command-dialog-overlay]"
    ) as HTMLElement | null,
    content: dialog.querySelector(
      "[data-command-dialog-content]"
    ) as HTMLElement | null,
  };
}

function isCommandDialogOpen(dialog: Element) {
  const { overlay } = getCommandDialogParts(dialog);
  return overlay ? !overlay.hidden : false;
}

function openCommandDialog(dialog: Element) {
  const { trigger, overlay, content } = getCommandDialogParts(dialog);
  if (overlay) overlay.hidden = false;
  if (content) {
    content.hidden = false;
    commandDialogFocusTraps.set(dialog, trapFocus(content));
    const input = content.querySelector("[data-command-input]") as
      | HTMLInputElement
      | null;
    input?.focus();
  }
  trigger?.setAttribute("aria-expanded", "true");
  trigger?.setAttribute("data-state", "open");
  document.body.style.overflow = "hidden";
}

function closeCommandDialog(dialog: Element) {
  const { trigger, overlay, content } = getCommandDialogParts(dialog);
  if (overlay) overlay.hidden = true;
  if (content) content.hidden = true;
  trigger?.setAttribute("aria-expanded", "false");
  trigger?.setAttribute("data-state", "closed");
  commandDialogFocusTraps.get(dialog)?.();
  commandDialogFocusTraps.delete(dialog);
  document.body.style.overflow = "";

  const input = content?.querySelector("[data-command-input]") as
    | HTMLInputElement
    | null;
  if (input) {
    input.value = "";
    input.dispatchEvent(new Event("input"));
  }

  trigger?.focus();
}

// Bound once per session; resolves the live dialog at event time so the
// shortcut can't act on dialogs detached by view-transition swaps (which
// previously locked scrolling on unrelated pages).
let documentListenersBound = false;

function bindCommandDialogListeners() {
  if (documentListenersBound) return;
  documentListenersBound = true;

  document.addEventListener("keydown", (e) => {
    const dialogs = Array.from(
      document.querySelectorAll("[data-command-dialog]")
    );
    if (dialogs.length === 0) return;

    if ((e.metaKey || e.ctrlKey) && e.key === "k") {
      e.preventDefault();
      const openDialog = dialogs.find(isCommandDialogOpen);
      if (openDialog) {
        closeCommandDialog(openDialog);
      } else {
        openCommandDialog(dialogs[0]);
      }
    }

    if (e.key === "Escape") {
      dialogs.filter(isCommandDialogOpen).forEach(closeCommandDialog);
    }
  });
}

export function initCommandDialogs() {
  bindCommandDialogListeners();

  document.querySelectorAll("[data-command-dialog]").forEach((dialog) => {
    if (dialog.hasAttribute("data-dialog-initialized")) return;
    dialog.setAttribute("data-dialog-initialized", "true");

    const { trigger, overlay } = getCommandDialogParts(dialog);

    trigger?.setAttribute("aria-haspopup", "dialog");
    trigger?.setAttribute("aria-expanded", "false");
    trigger?.setAttribute("data-state", "closed");

    trigger?.addEventListener("click", () => openCommandDialog(dialog));

    overlay?.addEventListener("click", (e) => {
      if (e.target === overlay) closeCommandDialog(dialog);
    });
  });
}
