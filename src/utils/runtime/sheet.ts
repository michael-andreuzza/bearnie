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

// Bound once per session; resolves live sheets at event time so
// listeners don't accumulate across view-transition navigations.
let documentListenersBound = false;

function bindDocumentListeners() {
  if (documentListenersBound) return;
  documentListenersBound = true;

  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    document.querySelectorAll("[data-sheet]").forEach((sheet) => {
      if (isTopModal(sheet)) (sheet as any).__closeSheet?.();
    });
  });
}

export function initSheets() {
  bindDocumentListeners();

  document.querySelectorAll("[data-sheet]").forEach((sheet) => {
    if (sheet.hasAttribute("data-initialized")) return;
    sheet.setAttribute("data-initialized", "true");

    const trigger = sheet.querySelector("[data-sheet-trigger]") as HTMLElement;
    const overlay = sheet.querySelector("[data-sheet-overlay]") as HTMLElement;
    const content = sheet.querySelector("[data-sheet-content]") as HTMLElement;
    const title = sheet.querySelector("[data-sheet-title]") as HTMLElement;
    const description = sheet.querySelector("[data-sheet-description]") as HTMLElement;

    if (!trigger || !overlay || !content) return;

    if (title && !title.id) {
      title.id = generateId("sheet-title");
    }
    if (description && !description.id) {
      description.id = generateId("sheet-desc");
    }

    if (title?.id) content.setAttribute("aria-labelledby", title.id);
    if (description?.id) content.setAttribute("aria-describedby", description.id);

    // Move overlay and content to body to escape stacking context
    document.body.appendChild(overlay);
    document.body.appendChild(content);

    let cleanupFocusTrap: (() => void) | null = null;

    trigger.setAttribute("aria-haspopup", "dialog");
    trigger.setAttribute("aria-expanded", "false");
    trigger.setAttribute("data-state", "closed");

    // No-op when already closed (or mid-exit-animation) so the shared Escape
    // handler can call it blindly without double-releasing the scroll lock
    function closeSheet() {
      if (overlay.hidden || overlay.getAttribute("data-state") === "closed") return;
      removeModal(sheet);
      hideOverlay(overlay);
      hideOverlay(content);
      unlockScroll();
      trigger.setAttribute("aria-expanded", "false");
      trigger.setAttribute("data-state", "closed");
      cleanupFocusTrap?.();
      cleanupFocusTrap = null;
      trigger?.focus();
    }
    (sheet as any).__closeSheet = closeSheet;

    trigger.addEventListener("click", () => {
      showOverlay(overlay);
      showOverlay(content);
      lockScroll();
      pushModal(sheet);
      trigger.setAttribute("aria-expanded", "true");
      trigger.setAttribute("data-state", "open");
      cleanupFocusTrap = trapFocus(content);
    });

    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) closeSheet();
    });

    content.querySelectorAll("[data-sheet-close]").forEach((btn) => {
      btn.addEventListener("click", closeSheet);
    });
  });
}
