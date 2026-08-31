/**
 * Overlay Utilities
 *
 * - showOverlay / hideOverlay: toggle an element's visibility while playing
 *   its [data-state] enter/exit animations (defined in bearnie.css).
 * - lockScroll / unlockScroll: reference-counted body scroll lock so nested
 *   modals don't unlock the page while another modal is still open.
 * - pushModal / removeModal / isTopModal: a stack of open modals so Escape
 *   only closes the most recently opened one.
 */

// Cancel functions for exits still animating, so a quick re-open doesn't
// hide the element when the stale exit animation finishes.
const pendingExits = new WeakMap<HTMLElement, () => void>();

/** Reveal an overlay element and play its enter animation. */
export function showOverlay(el: HTMLElement): void {
  pendingExits.get(el)?.();
  el.hidden = false;
  el.setAttribute("data-state", "open");
}

/**
 * Play the exit animation, then set `hidden`. Calls `done` once the element
 * is hidden (immediately when no exit animation applies, e.g. with
 * prefers-reduced-motion). If the overlay is re-opened mid-exit, the hide is
 * cancelled and `done` never runs.
 */
export function hideOverlay(el: HTMLElement, done?: () => void): void {
  if (el.hidden) {
    done?.();
    return;
  }
  pendingExits.get(el)?.();
  el.setAttribute("data-state", "closed");

  const finish = () => {
    pendingExits.delete(el);
    el.hidden = true;
    done?.();
  };

  const animation = getComputedStyle(el).animationName;
  if (!animation || animation === "none") {
    finish();
    return;
  }

  let timer = 0;
  const cancel = () => {
    clearTimeout(timer);
    el.removeEventListener("animationend", onEnd);
    pendingExits.delete(el);
  };
  const onEnd = (e: AnimationEvent) => {
    if (e.target !== el) return;
    cancel();
    finish();
  };
  el.addEventListener("animationend", onEnd);
  // Fallback in case animationend never fires (interrupted animation etc.)
  timer = window.setTimeout(() => {
    cancel();
    finish();
  }, 300);
  pendingExits.set(el, cancel);
}

let scrollLockCount = 0;

/** Lock body scrolling. Safe to nest: only the first lock applies. */
export function lockScroll(): void {
  if (++scrollLockCount === 1) {
    document.body.style.overflow = "hidden";
  }
}

/** Release one scroll lock. The page unlocks when all locks are released. */
export function unlockScroll(): void {
  if (scrollLockCount > 0 && --scrollLockCount === 0) {
    document.body.style.overflow = "";
  }
}

const modalStack: Element[] = [];

/** Register a modal as opened (it becomes the topmost). */
export function pushModal(el: Element): void {
  removeModal(el);
  modalStack.push(el);
}

/** Unregister a modal when it closes. */
export function removeModal(el: Element): void {
  const index = modalStack.lastIndexOf(el);
  if (index !== -1) modalStack.splice(index, 1);
}

/**
 * Whether this modal is the topmost open one. Modals not registered on the
 * stack (or an empty stack) report true so callers can fall back to their
 * previous behavior.
 */
export function isTopModal(el: Element): boolean {
  if (modalStack.length === 0) return true;
  return modalStack[modalStack.length - 1] === el;
}

// View transitions replace the <body>, dropping open modals with it. Reset
// the bookkeeping so stale locks can't freeze scrolling on the next page.
if (typeof document !== "undefined") {
  document.addEventListener("astro:after-swap", () => {
    scrollLockCount = 0;
    modalStack.length = 0;
    document.body.style.overflow = "";
  });
}
