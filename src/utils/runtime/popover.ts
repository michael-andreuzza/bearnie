import { generateId } from "@/utils/focus-trap";

function getParts(popover: Element) {
  return {
    trigger: popover.querySelector("[data-popover-trigger]") as HTMLElement | null,
    content: popover.querySelector("[data-popover-content]") as HTMLElement | null,
  };
}

function closePopover(popover: Element, restoreFocus: boolean) {
  const { trigger, content } = getParts(popover);
  if (!content || content.hidden) return;
  content.hidden = true;
  trigger?.setAttribute("aria-expanded", "false");
  trigger?.setAttribute("data-state", "closed");
  if (restoreFocus) trigger?.focus();
}

// Document-level listeners are bound once per session and resolve the
// live popovers at event time, so they don't accumulate across
// view-transition navigations.
let documentListenersBound = false;

function bindDocumentListeners() {
  if (documentListenersBound) return;
  documentListenersBound = true;

  document.addEventListener("click", (e) => {
    document.querySelectorAll("[data-popover]").forEach((popover) => {
      const { content } = getParts(popover);
      if (content && !content.hidden && !popover.contains(e.target as Node)) {
        closePopover(popover, false);
      }
    });
  });

  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    document.querySelectorAll("[data-popover]").forEach((popover) => {
      closePopover(popover, true);
    });
  });
}

export function initPopovers() {
  bindDocumentListeners();

  document.querySelectorAll("[data-popover]").forEach((popover) => {
    if (popover.hasAttribute("data-initialized")) return;
    popover.setAttribute("data-initialized", "true");

    const { trigger, content } = getParts(popover);

    if (!trigger || !content) return;

    if (!content.id) {
      content.id = generateId("popover");
    }

    trigger.setAttribute("aria-haspopup", "dialog");
    trigger.setAttribute("aria-controls", content.id);
    trigger.setAttribute("aria-expanded", "false");
    trigger.setAttribute("data-state", "closed");

    const openPopover = () => {
      content.hidden = false;
      trigger.setAttribute("aria-expanded", "true");
      trigger.setAttribute("data-state", "open");
      const firstFocusable = content.querySelector(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      ) as HTMLElement | null;
      firstFocusable?.focus();
    };

    trigger.addEventListener("click", () => {
      if (content.hidden) {
        openPopover();
      } else {
        closePopover(popover, true);
      }
    });
  });
}
