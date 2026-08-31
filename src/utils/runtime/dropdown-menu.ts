import { generateId } from "@/utils/focus-trap";
import {
  positionFloating,
  type FloatingSide,
  type FloatingAlign,
} from "@/utils/position";
import { showOverlay, hideOverlay } from "@/utils/overlay";

const positionCleanups = new WeakMap<Element, () => void>();

function getParts(dropdown: Element) {
  return {
    trigger: dropdown.querySelector("[data-dropdown-trigger]") as HTMLElement | null,
    content: dropdown.querySelector("[data-dropdown-content]") as HTMLElement | null,
  };
}

// "Open" means visible and not mid-exit-animation, so a click during the
// exit reopens instead of double-closing.
function isOpen(content: HTMLElement) {
  return !content.hidden && content.getAttribute("data-state") !== "closed";
}

function closeSubmenu(sub: Element, restoreFocus = false) {
  const trigger = sub.querySelector("[data-dropdown-sub-trigger]") as HTMLElement | null;
  const content = sub.querySelector("[data-dropdown-sub-content]") as HTMLElement | null;
  if (!content || !isOpen(content)) return;
  hideOverlay(content);
  trigger?.setAttribute("data-state", "closed");
  trigger?.setAttribute("aria-expanded", "false");
  if (restoreFocus) trigger?.focus();
}

function closeDropdown(dropdown: Element, restoreFocus: boolean) {
  const { trigger, content } = getParts(dropdown);
  if (!content || !isOpen(content)) return;
  content
    .querySelectorAll("[data-dropdown-sub]")
    .forEach((sub) => closeSubmenu(sub));
  // Stop repositioning immediately; inline coordinates stay put so the
  // exit animation plays in place.
  positionCleanups.get(dropdown)?.();
  positionCleanups.delete(dropdown);
  hideOverlay(content);
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

/** Arrow-key navigation over a list of menu items. Returns true if handled. */
function navigateItems(e: KeyboardEvent, items: HTMLElement[]): boolean {
  if (items.length === 0) return false;
  const currentIndex = items.indexOf(document.activeElement as HTMLElement);

  switch (e.key) {
    case "ArrowDown": {
      e.preventDefault();
      items[(currentIndex + 1) % items.length].focus();
      return true;
    }
    case "ArrowUp": {
      e.preventDefault();
      items[(currentIndex - 1 + items.length) % items.length].focus();
      return true;
    }
    case "Home":
      e.preventDefault();
      items[0].focus();
      return true;
    case "End":
      e.preventDefault();
      items[items.length - 1].focus();
      return true;
  }
  return false;
}

function initSubmenus(content: HTMLElement) {
  content.querySelectorAll("[data-dropdown-sub]").forEach((sub) => {
    const trigger = sub.querySelector("[data-dropdown-sub-trigger]") as HTMLElement | null;
    const subContent = sub.querySelector("[data-dropdown-sub-content]") as HTMLElement | null;
    if (!trigger || !subContent) return;

    if (!subContent.id) subContent.id = generateId("dropdown-sub");
    trigger.setAttribute("aria-controls", subContent.id);

    const subItems = () =>
      Array.from(
        subContent.querySelectorAll("[data-dropdown-item]:not([disabled]):not([data-disabled])"),
      ) as HTMLElement[];

    let closeTimeout: ReturnType<typeof setTimeout>;

    const open = () => {
      clearTimeout(closeTimeout);
      if (isOpen(subContent)) return;
      showOverlay(subContent);
      trigger.setAttribute("data-state", "open");
      trigger.setAttribute("aria-expanded", "true");
    };

    const scheduleClose = () => {
      closeTimeout = setTimeout(() => closeSubmenu(sub), 100);
    };

    trigger.addEventListener("mouseenter", open);
    trigger.addEventListener("mouseleave", scheduleClose);
    subContent.addEventListener("mouseenter", () => clearTimeout(closeTimeout));
    subContent.addEventListener("mouseleave", scheduleClose);

    trigger.addEventListener("click", (e) => {
      // A submenu trigger toggles its submenu instead of selecting an item
      e.stopPropagation();
      if (isOpen(subContent)) closeSubmenu(sub);
      else open();
    });

    trigger.addEventListener("keydown", (e) => {
      const event = e as KeyboardEvent;
      if (event.key === "ArrowRight" || event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        event.stopPropagation();
        open();
        subItems()[0]?.focus();
      }
    });

    subContent.addEventListener("keydown", (e) => {
      const event = e as KeyboardEvent;
      if (event.key === "ArrowLeft" || event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        closeSubmenu(sub, true);
        return;
      }
      // Keep arrow navigation scoped to the submenu's own items
      if (navigateItems(event, subItems())) {
        event.stopPropagation();
      } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.stopPropagation();
      }
    });
  });
}

function initCheckboxItems(content: HTMLElement) {
  content.querySelectorAll("[data-dropdown-checkbox-item]").forEach((item) => {
    const toggle = () => {
      const checked = item.getAttribute("data-checked") !== "true";
      item.setAttribute("data-checked", String(checked));
      item.setAttribute("aria-checked", String(checked));
      item.querySelector("[data-check-icon]")?.classList.toggle("hidden", !checked);
      item.dispatchEvent(
        new CustomEvent("dropdown-checkbox-change", {
          bubbles: true,
          detail: { checked },
        }),
      );
    };

    item.addEventListener("click", toggle);
    item.addEventListener("keydown", (e) => {
      const key = (e as KeyboardEvent).key;
      if (key === "Enter" || key === " ") {
        e.preventDefault();
        toggle();
      }
    });
  });
}

function initRadioGroups(content: HTMLElement) {
  content.querySelectorAll("[data-dropdown-radio-group]").forEach((group) => {
    const items = Array.from(
      group.querySelectorAll("[data-dropdown-radio-item]"),
    );

    const apply = (value: string | null) => {
      items.forEach((item) => {
        const checked = item.getAttribute("data-value") === value;
        item.setAttribute("data-checked", String(checked));
        item.setAttribute("aria-checked", String(checked));
        item.querySelector("[data-radio-icon]")?.classList.toggle("hidden", !checked);
      });
    };

    apply(group.getAttribute("data-value"));

    items.forEach((item) => {
      const select = () => {
        const value = item.getAttribute("data-value") || "";
        group.setAttribute("data-value", value);
        apply(value);
        group.dispatchEvent(
          new CustomEvent("dropdown-radio-change", {
            bubbles: true,
            detail: { value },
          }),
        );
      };

      item.addEventListener("click", select);
      item.addEventListener("keydown", (e) => {
        const key = (e as KeyboardEvent).key;
        if (key === "Enter" || key === " ") {
          e.preventDefault();
          select();
        }
      });
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

    // Top-level items only; submenu contents run their own navigation
    const items = () =>
      (
        Array.from(
          content.querySelectorAll(
            "[data-dropdown-item]:not([disabled]):not([data-disabled])",
          ),
        ) as HTMLElement[]
      ).filter((item) => !item.closest("[data-dropdown-sub-content]"));

    const openDropdown = () => {
      showOverlay(content);
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

      items()[0]?.focus();
    };

    const toggleDropdown = () => {
      if (isOpen(content)) {
        closeDropdown(dropdown, true);
      } else {
        openDropdown();
      }
    };

    trigger.addEventListener("click", toggleDropdown);

    trigger.addEventListener("keydown", (e) => {
      const event = e as KeyboardEvent;
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        toggleDropdown();
      } else if (event.key === "ArrowDown" && !isOpen(content)) {
        event.preventDefault();
        openDropdown();
      }
    });

    content.addEventListener("keydown", (e) => {
      const event = e as KeyboardEvent;
      if (navigateItems(event, items())) return;

      switch (event.key) {
        case "Escape":
          event.preventDefault();
          closeDropdown(dropdown, true);
          break;
        case "Tab":
          closeDropdown(dropdown, false);
          break;
      }
    });

    content.querySelectorAll("[data-dropdown-item]").forEach((item) => {
      // Submenu triggers and checkbox/radio items don't dismiss the menu
      if (
        item.hasAttribute("data-dropdown-sub-trigger") ||
        item.hasAttribute("data-dropdown-checkbox-item") ||
        item.hasAttribute("data-dropdown-radio-item")
      ) {
        return;
      }
      item.addEventListener("click", () => {
        if (!dropdown.hasAttribute("data-dropdown-keep-open")) {
          closeDropdown(dropdown, true);
        }
      });
    });

    initSubmenus(content);
    initCheckboxItems(content);
    initRadioGroups(content);
  });
}
