type UiInit = () => void;

declare global {
  interface Window {
    __bearnieUiInits?: Set<UiInit>;
    __bearnieUiPageLoadBound?: boolean;
  }
}

/**
 * Registers a UI runtime initializer. The initializer runs immediately and
 * again after every Astro view-transition navigation (`astro:page-load`).
 *
 * Components register only the features they use, so a page ships and runs
 * just the runtime modules its components need. Registration is idempotent:
 * no matter how many component instances import the same initializer, it is
 * registered (and the page-load listener bound) exactly once per session.
 */
export function registerUiInit(init: UiInit) {
  if (typeof window === "undefined") return;

  const inits = (window.__bearnieUiInits ??= new Set<UiInit>());
  if (inits.has(init)) return;
  inits.add(init);
  init();

  if (!window.__bearnieUiPageLoadBound) {
    window.__bearnieUiPageLoadBound = true;
    document.addEventListener("astro:page-load", () => {
      window.__bearnieUiInits?.forEach((fn) => fn());
    });
  }
}
