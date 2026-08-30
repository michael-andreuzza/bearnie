import { trapFocus, generateId } from "@/utils/focus-trap";

const focusTrapCleanups = new WeakMap<Element, () => void>();

function closeDialog(dialog: Element) {
  const trigger = dialog.querySelector("[data-dialog-trigger]") as HTMLElement | null;
  const overlay = dialog.querySelector("[data-dialog-overlay]") as HTMLElement | null;
  const content = dialog.querySelector("[data-dialog-content]") as HTMLElement | null;
  if (overlay) overlay.hidden = true;
  if (content) content.hidden = true;
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

  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    document.querySelectorAll("[data-dialog]").forEach((dialog) => {
      if (isOpen(dialog)) closeDialog(dialog);
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

    trigger.addEventListener("click", () => {
      if (overlay) overlay.hidden = false;
      if (content) {
        content.hidden = false;
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
