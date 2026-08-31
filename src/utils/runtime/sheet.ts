import { trapFocus, generateId } from "@/utils/focus-trap";

// Bound once per session; resolves live sheets at event time so
// listeners don't accumulate across view-transition navigations.
let documentListenersBound = false;

function bindDocumentListeners() {
  if (documentListenersBound) return;
  documentListenersBound = true;

  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    document.querySelectorAll("[data-sheet]").forEach((sheet) => {
      (sheet as any).__closeSheet?.();
    });
  });
}

export function initSheets() {
  bindDocumentListeners();

  document.querySelectorAll("[data-sheet]").forEach((sheet) => {
    if (sheet.hasAttribute("data-initialized")) return;
    sheet.setAttribute("data-initialized", "true");

    const trigger = sheet.querySelector("[data-sheet-trigger]") as HTMLElement;
    const overlay = sheet.querySelector("[data-sheet-overlay]");
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

    // No-op when already closed so the shared Escape handler can call it blindly
    function closeSheet() {
      if ((overlay as HTMLElement).hidden) return;
      (overlay as HTMLElement).hidden = true;
      (content as HTMLElement).hidden = true;
      document.body.style.overflow = "";
      cleanupFocusTrap?.();
      cleanupFocusTrap = null;
      trigger?.focus();
    }
    (sheet as any).__closeSheet = closeSheet;

    trigger.addEventListener("click", () => {
      (overlay as HTMLElement).hidden = false;
      (content as HTMLElement).hidden = false;
      document.body.style.overflow = "hidden";
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
