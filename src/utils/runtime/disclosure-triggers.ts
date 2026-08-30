const TRIGGER_SELECTOR = [
  "[data-popover-trigger]",
  "[data-command-dialog-trigger]",
  "[data-dialog-trigger]",
  "[data-alert-dialog-trigger]",
  "[data-sheet-trigger]",
  "[data-collapsible-trigger]",
].join(", ");

export function initDisclosureTriggers() {
  document.querySelectorAll(TRIGGER_SELECTOR).forEach((trigger) => {
    if (trigger.hasAttribute("data-trigger-initialized")) return;
    trigger.setAttribute("data-trigger-initialized", "true");

    trigger.addEventListener("keydown", (e) => {
      const event = e as KeyboardEvent;
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        trigger.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      }
    });
  });
}
