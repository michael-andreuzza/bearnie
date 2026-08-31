import { trapFocus, generateId } from "@/utils/focus-trap";

const focusTrapCleanups = new WeakMap<Element, () => void>();

function closeAlertDialog(dialog: Element) {
  const trigger = dialog.querySelector("[data-alert-dialog-trigger]") as HTMLElement | null;
  const overlay = dialog.querySelector("[data-alert-dialog-overlay]") as HTMLElement | null;
  const content = dialog.querySelector("[data-alert-dialog-content]") as HTMLElement | null;
  if (overlay) overlay.hidden = true;
  if (content) content.hidden = true;
  document.body.style.overflow = "";
  focusTrapCleanups.get(dialog)?.();
  focusTrapCleanups.delete(dialog);
  trigger?.focus();
}

// Bound once per session; resolves live dialogs at event time so
// listeners don't accumulate across view-transition navigations.
let documentListenersBound = false;

function bindDocumentListeners() {
  if (documentListenersBound) return;
  documentListenersBound = true;

  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    document.querySelectorAll("[data-alert-dialog]").forEach((dialog) => {
      const overlay = dialog.querySelector("[data-alert-dialog-overlay]") as HTMLElement | null;
      if (overlay && !overlay.hidden) closeAlertDialog(dialog);
    });
  });
}

export function initAlertDialogs() {
  bindDocumentListeners();

  document.querySelectorAll("[data-alert-dialog]").forEach((dialog) => {
    if (dialog.hasAttribute("data-initialized")) return;
    dialog.setAttribute("data-initialized", "true");

    const trigger = dialog.querySelector("[data-alert-dialog-trigger]") as HTMLElement;
    const overlay = dialog.querySelector("[data-alert-dialog-overlay]") as HTMLElement;
    const content = dialog.querySelector("[data-alert-dialog-content]") as HTMLElement;
    const cancelButtons = dialog.querySelectorAll("[data-alert-dialog-cancel]");
    const actionButtons = dialog.querySelectorAll("[data-alert-dialog-action]");
    const title = dialog.querySelector("[data-alert-dialog-title]") as HTMLElement;
    const description = dialog.querySelector("[data-alert-dialog-description]") as HTMLElement;

    if (!trigger) return;

    if (title && !title.id) {
      title.id = generateId("alert-dialog-title");
    }
    if (description && !description.id) {
      description.id = generateId("alert-dialog-desc");
    }

    if (content) {
      if (title?.id) content.setAttribute("aria-labelledby", title.id);
      if (description?.id) content.setAttribute("aria-describedby", description.id);
    }

    trigger.addEventListener("click", () => {
      if (overlay) overlay.hidden = false;
      if (content) {
        content.hidden = false;
        document.body.style.overflow = "hidden";
        focusTrapCleanups.set(dialog, trapFocus(content));
      }
    });

    cancelButtons.forEach((btn) => {
      btn.addEventListener("click", () => closeAlertDialog(dialog));
    });
    actionButtons.forEach((btn) => {
      btn.addEventListener("click", () => closeAlertDialog(dialog));
    });

    // Note: no close on overlay click for alert dialogs (intentional)
  });
}
