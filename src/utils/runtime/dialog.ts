import { trapFocus, generateId } from "@/utils/focus-trap";
import {
  showOverlay,
  hideOverlay,
  lockScroll,
  unlockScroll,
  pushModal,
  removeModal,
  isTopModal,
} from "@/utils/overlay";

const focusTrapCleanups = new WeakMap<Element, () => void>();

function closeDialog(dialog: Element) {
  const trigger = dialog.querySelector("[data-dialog-trigger]") as HTMLElement | null;
  const overlay = dialog.querySelector("[data-dialog-overlay]") as HTMLElement | null;
  const content = dialog.querySelector("[data-dialog-content]") as HTMLElement | null;
  // Skip when already closed or mid-exit-animation, so a second close can't
  // release the scroll lock twice.
  if (!content || content.hidden || content.getAttribute("data-state") === "closed") return;
  removeModal(dialog);
  if (overlay) hideOverlay(overlay);
  hideOverlay(content);
  unlockScroll();
  trigger?.setAttribute("aria-expanded", "false");
  trigger?.setAttribute("data-state", "closed");
  focusTrapCleanups.get(dialog)?.();
  focusTrapCleanups.delete(dialog);
  trigger?.focus();
}

function isOpen(dialog: Element) {
  const overlay = dialog.querySelector("[data-dialog-overlay]") as HTMLElement | null;
  return overlay ? !overlay.hidden : false;
}

// Bound once per session; resolves live dialogs at event time so
// listeners don't accumulate across view-transition navigations.
let documentListenersBound = false;

function bindDocumentListeners() {
  if (documentListenersBound) return;
  documentListenersBound = true;

  // Close only the topmost open dialog, so nested dialogs unwind one
  // Escape press at a time.
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    document.querySelectorAll("[data-dialog]").forEach((dialog) => {
      if (isOpen(dialog) && isTopModal(dialog)) closeDialog(dialog);
    });
  });
}

export function initDialogs() {
  bindDocumentListeners();

  document.querySelectorAll("[data-dialog]").forEach((dialog) => {
    if (dialog.hasAttribute("data-initialized")) return;
    dialog.setAttribute("data-initialized", "true");

    const trigger = dialog.querySelector(
      "[data-dialog-trigger]",
    ) as HTMLElement;
    const overlay = dialog.querySelector(
      "[data-dialog-overlay]",
    ) as HTMLElement;
    const content = dialog.querySelector(
      "[data-dialog-content]",
    ) as HTMLElement;
    const closeButtons = dialog.querySelectorAll("[data-dialog-close]");
    const title = dialog.querySelector("[data-dialog-title]") as HTMLElement;
    const description = dialog.querySelector(
      "[data-dialog-description]",
    ) as HTMLElement;

    if (!trigger) return;

    if (title && !title.id) {
      title.id = generateId("dialog-title");
    }
    if (description && !description.id) {
      description.id = generateId("dialog-desc");
    }

    if (content) {
      if (title?.id) content.setAttribute("aria-labelledby", title.id);
      if (description?.id)
        content.setAttribute("aria-describedby", description.id);
    }

    trigger.setAttribute("aria-haspopup", "dialog");
    trigger.setAttribute("aria-expanded", "false");
    trigger.setAttribute("data-state", "closed");

    trigger.addEventListener("click", () => {
      if (overlay) showOverlay(overlay);
      if (content) {
        showOverlay(content);
        lockScroll();
        pushModal(dialog);
        trigger.setAttribute("aria-expanded", "true");
        trigger.setAttribute("data-state", "open");
        focusTrapCleanups.set(dialog, trapFocus(content));
      }
    });

    closeButtons.forEach((btn) => {
      btn.addEventListener("click", () => closeDialog(dialog));
    });

    overlay?.addEventListener("click", (e) => {
      if (e.target === overlay) closeDialog(dialog);
    });
  });
}
