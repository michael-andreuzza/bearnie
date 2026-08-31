// Element that had focus when a menu opened, so we can restore it on close.
const focusRestoreTargets = new WeakMap<Element, HTMLElement>();

function closeContextMenu(content: HTMLElement, restoreFocus: boolean) {
  if (content.hidden) return;
  content.hidden = true;
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

export function initContextMenus() {
  bindDocumentListeners();

  document.querySelectorAll("[data-context-menu]").forEach((menu) => {
    if (menu.hasAttribute("data-initialized")) return;
    menu.setAttribute("data-initialized", "true");

    const trigger = menu.querySelector("[data-context-menu-trigger]");
    const content = menu.querySelector("[data-context-menu-content]") as HTMLElement;

    if (!trigger || !content) return;

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
      content.hidden = false;

      // Adjust if menu goes off-screen, then move focus into the menu
      requestAnimationFrame(() => {
        const rect = content.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        if (rect.right > viewportWidth) {
          content.style.left = `${viewportWidth - rect.width - 8}px`;
        }
        if (rect.bottom > viewportHeight) {
          content.style.top = `${viewportHeight - rect.height - 8}px`;
        }

        const firstItem = content.querySelector(
          "[data-context-menu-item]:not([disabled])",
        ) as HTMLElement | null;
        firstItem?.focus();
      });
    });

    // Handle item clicks
    content.querySelectorAll("[data-context-menu-item]").forEach((item) => {
      item.addEventListener("click", () => {
        closeContextMenu(content, true);
      });
    });

    // Keyboard navigation
    content.addEventListener("keydown", (e) => {
      const event = e as KeyboardEvent;
      const items = Array.from(
        content.querySelectorAll("[data-context-menu-item]:not([disabled])"),
      );
      const currentIndex = items.indexOf(document.activeElement as Element);

      if (event.key === "ArrowDown") {
        event.preventDefault();
        const nextIndex = currentIndex < items.length - 1 ? currentIndex + 1 : 0;
        (items[nextIndex] as HTMLElement).focus();
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        const prevIndex = currentIndex > 0 ? currentIndex - 1 : items.length - 1;
        (items[prevIndex] as HTMLElement).focus();
      } else if (event.key === "Home") {
        event.preventDefault();
        (items[0] as HTMLElement | undefined)?.focus();
      } else if (event.key === "End") {
        event.preventDefault();
        (items[items.length - 1] as HTMLElement | undefined)?.focus();
      }
    });
  });
}
