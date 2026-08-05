import { trapFocus, generateId } from "@/utils/focus-trap";

export function initDialogs() {
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

    let cleanupFocusTrap: (() => void) | null = null;

    trigger.addEventListener("click", () => {
      if (overlay) overlay.hidden = false;
      if (content) {
        content.hidden = false;
        cleanupFocusTrap = trapFocus(content);
      }
    });

    const closeDialog = () => {
      if (overlay) overlay.hidden = true;
      if (content) content.hidden = true;
      cleanupFocusTrap?.();
      cleanupFocusTrap = null;
      trigger?.focus();
    };

    closeButtons.forEach((btn) => {
      btn.addEventListener("click", closeDialog);
    });

    overlay?.addEventListener("click", (e) => {
      if (e.target === overlay) closeDialog();
    });

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && overlay && !overlay.hidden) {
        closeDialog();
      }
    };

    document.addEventListener("keydown", handleEscape);
  });
}
