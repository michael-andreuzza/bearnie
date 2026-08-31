import { generateId } from "@/utils/focus-trap";
import { showOverlay, hideOverlay } from "@/utils/overlay";

// Element that had focus when a menu opened, so we can restore it on close.
const focusRestoreTargets = new WeakMap<Element, HTMLElement>();

// "Open" means visible and not mid-exit-animation, so a click during the
// exit reopens instead of double-closing.
function isMenuOpen(content: HTMLElement) {
  return !content.hidden && content.getAttribute("data-state") !== "closed";
}

function closeSubmenu(sub: Element, restoreFocus = false) {
  const trigger = sub.querySelector("[data-context-menu-sub-trigger]") as HTMLElement | null;
  const content = sub.querySelector("[data-context-menu-sub-content]") as HTMLElement | null;
  if (!content || !isMenuOpen(content)) return;
  hideOverlay(content);
  trigger?.setAttribute("data-state", "closed");
  trigger?.setAttribute("aria-expanded", "false");
  if (restoreFocus) trigger?.focus();
}

function closeContextMenu(content: HTMLElement, restoreFocus: boolean) {
  if (!isMenuOpen(content)) return;
  content
    .querySelectorAll("[data-context-menu-sub]")
    .forEach((sub) => closeSubmenu(sub));
  hideOverlay(content);
  if (restoreFocus) focusRestoreTargets.get(content)?.focus();
  focusRestoreTargets.delete(content);
}

function closeAllContextMenus(restoreFocus = false, except?: Element) {
  document.querySelectorAll("[data-context-menu-content]").forEach((c) => {
    if (c !== except) closeContextMenu(c as HTMLElement, restoreFocus);
  });
}

// Document listeners bound once; live menus resolved at event time so
// they don't accumulate across view-transition navigations.
let documentListenersBound = false;

function bindDocumentListeners() {
  if (documentListenersBound) return;
  documentListenersBound = true;

  document.addEventListener("click", (e) => {
    document.querySelectorAll("[data-context-menu-content]").forEach((c) => {
      if (!c.contains(e.target as Node)) closeContextMenu(c as HTMLElement, false);
    });
  });

  document.addEventListener("contextmenu", (e) => {
    document.querySelectorAll("[data-context-menu]").forEach((menu) => {
      const trigger = menu.querySelector("[data-context-menu-trigger]");
      const content = menu.querySelector("[data-context-menu-content]") as HTMLElement | null;
      if (content && trigger && !trigger.contains(e.target as Node)) {
        closeContextMenu(content, false);
      }
    });
  });

  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    closeAllContextMenus(true);
  });

  // capture: true so scrolls inside nested scroll containers also close menus
  document.addEventListener(
    "scroll",
    () => closeAllContextMenus(false),
    { capture: true, passive: true },
  );
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
  content.querySelectorAll("[data-context-menu-sub]").forEach((sub) => {
    const trigger = sub.querySelector("[data-context-menu-sub-trigger]") as HTMLElement | null;
    const subContent = sub.querySelector("[data-context-menu-sub-content]") as HTMLElement | null;
    if (!trigger || !subContent) return;

    if (!subContent.id) subContent.id = generateId("context-menu-sub");
    trigger.setAttribute("aria-controls", subContent.id);

    const subItems = () =>
      Array.from(
        subContent.querySelectorAll("[data-context-menu-item]:not([disabled])"),
      ) as HTMLElement[];

    let closeTimeout: ReturnType<typeof setTimeout>;

    const open = () => {
      clearTimeout(closeTimeout);
      if (isMenuOpen(subContent)) return;
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
      if (isMenuOpen(subContent)) closeSubmenu(sub);
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
  content.querySelectorAll("[data-context-menu-checkbox-item]").forEach((item) => {
    const toggle = () => {
      const checked = item.getAttribute("data-checked") !== "true";
      item.setAttribute("data-checked", String(checked));
      item.setAttribute("aria-checked", String(checked));
      item.querySelector("[data-check-icon]")?.classList.toggle("hidden", !checked);
      item.dispatchEvent(
        new CustomEvent("context-menu-checkbox-change", {
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
  content.querySelectorAll("[data-context-menu-radio-group]").forEach((group) => {
    const items = Array.from(
      group.querySelectorAll("[data-context-menu-radio-item]"),
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
          new CustomEvent("context-menu-radio-change", {
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

export function initContextMenus() {
  bindDocumentListeners();

  document.querySelectorAll("[data-context-menu]").forEach((menu) => {
    if (menu.hasAttribute("data-initialized")) return;
    menu.setAttribute("data-initialized", "true");

    const trigger = menu.querySelector("[data-context-menu-trigger]");
    const content = menu.querySelector("[data-context-menu-content]") as HTMLElement;

    if (!trigger || !content) return;

    // Top-level items only; submenu contents run their own navigation
    const items = () =>
      (
        Array.from(
          content.querySelectorAll("[data-context-menu-item]:not([disabled])"),
        ) as HTMLElement[]
      ).filter((item) => !item.closest("[data-context-menu-sub-content]"));

    // Right-click to open
    trigger.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      closeAllContextMenus(false, content);

      // Remember where focus was so Escape/selection can return to it
      focusRestoreTargets.set(
        content,
        (document.activeElement as HTMLElement) ?? (trigger as HTMLElement),
      );

      // Position at cursor
      const x = (e as MouseEvent).clientX;
      const y = (e as MouseEvent).clientY;

      content.style.position = "fixed";
      content.style.left = `${x}px`;
      content.style.top = `${y}px`;
      showOverlay(content);

      // Adjust if menu goes off-screen, then move focus into the menu.
      // offsetWidth/offsetHeight ignore the enter animation's transform.
      requestAnimationFrame(() => {
        const width = content.offsetWidth;
        const height = content.offsetHeight;

        if (x + width > window.innerWidth) {
          content.style.left = `${window.innerWidth - width - 8}px`;
        }
        if (y + height > window.innerHeight) {
          content.style.top = `${window.innerHeight - height - 8}px`;
        }

        items()[0]?.focus();
      });
    });

    // Handle item clicks: submenu triggers and checkbox/radio items don't
    // dismiss the menu
    content.querySelectorAll("[data-context-menu-item]").forEach((item) => {
      if (
        item.hasAttribute("data-context-menu-sub-trigger") ||
        item.hasAttribute("data-context-menu-checkbox-item") ||
        item.hasAttribute("data-context-menu-radio-item")
      ) {
        return;
      }
      item.addEventListener("click", () => {
        closeContextMenu(content, true);
      });
    });

    // Keyboard navigation
    content.addEventListener("keydown", (e) => {
      navigateItems(e as KeyboardEvent, items());
    });

    initSubmenus(content);
    initCheckboxItems(content);
    initRadioGroups(content);
  });
}
