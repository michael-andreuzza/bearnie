import { generateId } from "@/utils/focus-trap";
import {
  positionFloating,
  type FloatingSide,
  type FloatingAlign,
} from "@/utils/position";

const positionCleanups = new WeakMap<Element, () => void>();

function getParts(dropdown: Element) {
  return {
    trigger: dropdown.querySelector("[data-dropdown-trigger]") as HTMLElement | null,
    content: dropdown.querySelector("[data-dropdown-content]") as HTMLElement | null,
  };
}

function closeDropdown(dropdown: Element, restoreFocus: boolean) {
  const { trigger, content } = getParts(dropdown);
  if (!content || content.hidden) return;
  content.hidden = true;
  positionCleanups.get(dropdown)?.();
  positionCleanups.delete(dropdown);
  trigger?.setAttribute("aria-expanded", "false");
  trigger?.setAttribute("data-state", "closed");
  if (restoreFocus) trigger?.focus();
}

// Bound once per session; resolves live dropdowns at event time so
// listeners don't accumulate across view-transition navigations.
let documentListenersBound = false;

function bindDocumentListeners() {
  if (documentListenersBound) return;
  documentListenersBound = true;

  document.addEventListener("click", (e) => {
    document.querySelectorAll("[data-dropdown]").forEach((dropdown) => {
      const { content } = getParts(dropdown);
      if (content && !content.hidden && !dropdown.contains(e.target as Node)) {
        closeDropdown(dropdown, false);
      }
    });
  });

  // Document-level so Escape works even when focus never entered the menu
  // (e.g. an empty menu), matching the other overlay components.
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    document.querySelectorAll("[data-dropdown]").forEach((dropdown) => {
      const { content } = getParts(dropdown);
      if (content && !content.hidden) closeDropdown(dropdown, true);
    });
  });
}

export function initDropdowns() {
  bindDocumentListeners();

  document.querySelectorAll("[data-dropdown]").forEach((dropdown) => {
    if (dropdown.hasAttribute("data-initialized")) return;
    dropdown.setAttribute("data-initialized", "true");

    const { trigger, content } = getParts(dropdown);

    if (!trigger || !content) return;

    if (!content.id) {
      content.id = generateId("dropdown-menu");
    }

    trigger.setAttribute("aria-haspopup", "true");
    trigger.setAttribute("aria-controls", content.id);

    const items = () =>
      Array.from(
        content.querySelectorAll("[data-dropdown-item]:not([disabled])"),
      ) as HTMLElement[];
    let focusedIndex = -1;

    const openDropdown = () => {
      content.hidden = false;
      trigger.setAttribute("aria-expanded", "true");
      trigger.setAttribute("data-state", "open");

      const side = (content.dataset.side as FloatingSide) || "bottom";
      // Side menus align their top edge with the trigger (previous behavior)
      const align =
        side === "left" || side === "right"
          ? "start"
          : (content.dataset.align as FloatingAlign) || "end";
      positionCleanups.get(dropdown)?.();
      positionCleanups.set(
        dropdown,
        positionFloating(trigger, content, { side, align }),
      );

      const menuItems = items();
      if (menuItems.length > 0) {
        focusedIndex = 0;
        menuItems[0].focus();
      }
    };

    const toggleDropdown = () => {
      if (content.hidden) {
        openDropdown();
      } else {
        closeDropdown(dropdown, true);
      }
    };

    trigger.addEventListener("click", toggleDropdown);

    trigger.addEventListener("keydown", (e) => {
      const event = e as KeyboardEvent;
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        toggleDropdown();
      } else if (event.key === "ArrowDown" && content.hidden) {
        event.preventDefault();
        openDropdown();
      }
    });

    content.addEventListener("keydown", (e) => {
      const menuItems = items();
      if (menuItems.length === 0) return;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          focusedIndex = (focusedIndex + 1) % menuItems.length;
          menuItems[focusedIndex].focus();
          break;
        case "ArrowUp":
          e.preventDefault();
          focusedIndex =
            (focusedIndex - 1 + menuItems.length) % menuItems.length;
          menuItems[focusedIndex].focus();
          break;
        case "Home":
          e.preventDefault();
          focusedIndex = 0;
          menuItems[0].focus();
          break;
        case "End":
          e.preventDefault();
          focusedIndex = menuItems.length - 1;
          menuItems[focusedIndex].focus();
          break;
        case "Escape":
          e.preventDefault();
          closeDropdown(dropdown, true);
          break;
        case "Tab":
          closeDropdown(dropdown, false);
          break;
      }
    });

    content.querySelectorAll("[data-dropdown-item]").forEach((item) => {
      item.addEventListener("click", () => {
        if (!dropdown.hasAttribute("data-dropdown-keep-open")) {
          closeDropdown(dropdown, true);
        }
      });
    });
  });
}
