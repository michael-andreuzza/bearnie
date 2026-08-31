import { generateId } from "@/utils/focus-trap";

export function initTabs() {
  document.querySelectorAll("[data-tabs]").forEach((tabs) => {
    if (tabs.hasAttribute("data-initialized")) return;
    tabs.setAttribute("data-initialized", "true");

    const syncKey = tabs.getAttribute("data-sync-key");
    const orientation =
      tabs.getAttribute("data-orientation") || "horizontal";

    const tabsList = tabs.querySelector("[data-tabs-list]") as HTMLElement;
    const triggers = Array.from(
      tabs.querySelectorAll("[data-tabs-trigger]"),
    ) as HTMLElement[];
    const contents = Array.from(
      tabs.querySelectorAll("[data-tabs-content]"),
    ) as HTMLElement[];

    // A URL param (?<syncKey>=value) wins over the declared default, so
    // shared links restore the tab the sender was looking at. Ignored when
    // it doesn't match any tab.
    const urlValue = syncKey
      ? new URLSearchParams(window.location.search).get(syncKey)
      : null;
    const defaultValue =
      urlValue &&
      triggers.some((t) => t.getAttribute("data-value") === urlValue)
        ? urlValue
        : tabs.getAttribute("data-default-value");

    if (tabsList) {
      tabsList.setAttribute("data-orientation", orientation);
      tabsList.setAttribute("aria-orientation", orientation);
    }

    // Sliding pill behind the active trigger (styled in bearnie.css)
    let indicator: HTMLElement | null = null;
    if (tabsList) {
      indicator = document.createElement("span");
      indicator.setAttribute("data-tabs-indicator", "");
      indicator.setAttribute("aria-hidden", "true");
      indicator.hidden = true;
      tabsList.prepend(indicator);
    }

    const positionIndicator = (trigger: HTMLElement, animate: boolean) => {
      if (!indicator) return;
      indicator.hidden = false;
      if (!animate) indicator.style.transition = "none";
      indicator.style.width = `${trigger.offsetWidth}px`;
      indicator.style.height = `${trigger.offsetHeight}px`;
      indicator.style.transform = `translate(${trigger.offsetLeft}px, ${trigger.offsetTop}px)`;
      if (!animate) {
        // Restore the CSS transition after the jump has painted
        requestAnimationFrame(() => {
          if (indicator) indicator.style.transition = "";
        });
      }
    };

    // Track layout changes (font loading, container resizes) without animating
    if (tabsList && indicator) {
      new ResizeObserver(() => {
        const active = triggers.find(
          (t) => t.getAttribute("data-state") === "active",
        );
        if (active) positionIndicator(active, false);
      }).observe(tabsList);
    }

    triggers.forEach((trigger) => {
      trigger.setAttribute("data-orientation", orientation);
      const value = trigger.getAttribute("data-value");

      if (!trigger.id) {
        trigger.id = generateId(`tab-${value}`);
      }

      const matchingContent = contents.find(
        (c) => c.getAttribute("data-value") === value,
      );
      if (matchingContent) {
        if (!matchingContent.id) {
          matchingContent.id = generateId(`tabpanel-${value}`);
        }
        trigger.setAttribute("aria-controls", matchingContent.id);
        matchingContent.setAttribute("aria-labelledby", trigger.id);
      }
    });

    if (defaultValue) {
      triggers.forEach((trigger) => {
        const value = trigger.getAttribute("data-value");
        if (value === defaultValue) {
          trigger.setAttribute("data-state", "active");
          trigger.setAttribute("aria-selected", "true");
          trigger.setAttribute("tabindex", "0");
        } else {
          trigger.setAttribute("data-state", "inactive");
          trigger.setAttribute("aria-selected", "false");
          trigger.setAttribute("tabindex", "-1");
        }
      });

      contents.forEach((content) => {
        const value = content.getAttribute("data-value");
        if (value === defaultValue) {
          content.setAttribute("data-state", "active");
          content.hidden = false;
        } else {
          content.setAttribute("data-state", "inactive");
          content.hidden = true;
        }
      });

      const activeTrigger = triggers.find(
        (t) => t.getAttribute("data-value") === defaultValue,
      );
      if (activeTrigger) positionIndicator(activeTrigger, false);
    }

    const activateTab = (trigger: HTMLElement) => {
      const value = trigger.getAttribute("data-value");

      if (syncKey && value) {
        const url = new URL(window.location.href);
        url.searchParams.set(syncKey, value);
        history.replaceState(history.state, "", url);
      }

      triggers.forEach((t) => {
        const isActive = t.getAttribute("data-value") === value;
        t.setAttribute("data-state", isActive ? "active" : "inactive");
        t.setAttribute("aria-selected", String(isActive));
        t.setAttribute("tabindex", isActive ? "0" : "-1");
      });

      contents.forEach((content) => {
        const isActive = content.getAttribute("data-value") === value;
        content.setAttribute("data-state", isActive ? "active" : "inactive");
        content.hidden = !isActive;
      });

      positionIndicator(trigger, true);
      trigger.focus();
    };

    triggers.forEach((trigger) => {
      trigger.addEventListener("click", () => activateTab(trigger));
    });

    tabsList?.addEventListener("keydown", (e: KeyboardEvent) => {
      const currentIndex = triggers.findIndex(
        (t) => t === document.activeElement,
      );
      if (currentIndex === -1) return;

      let nextIndex = currentIndex;
      const isHorizontal = orientation === "horizontal";

      switch (e.key) {
        case "ArrowRight":
          if (isHorizontal) {
            e.preventDefault();
            nextIndex = (currentIndex + 1) % triggers.length;
          }
          break;
        case "ArrowLeft":
          if (isHorizontal) {
            e.preventDefault();
            nextIndex =
              (currentIndex - 1 + triggers.length) % triggers.length;
          }
          break;
        case "ArrowDown":
          if (!isHorizontal) {
            e.preventDefault();
            nextIndex = (currentIndex + 1) % triggers.length;
          }
          break;
        case "ArrowUp":
          if (!isHorizontal) {
            e.preventDefault();
            nextIndex =
              (currentIndex - 1 + triggers.length) % triggers.length;
          }
          break;
        case "Home":
          e.preventDefault();
          nextIndex = 0;
          break;
        case "End":
          e.preventDefault();
          nextIndex = triggers.length - 1;
          break;
        default:
          return;
      }

      if (nextIndex !== currentIndex) {
        activateTab(triggers[nextIndex]);
      }
    });
  });
}
