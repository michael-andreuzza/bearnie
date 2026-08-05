import { generateId } from "@/utils/focus-trap";

export function initDropdowns() {
  document.querySelectorAll("[data-dropdown]").forEach((dropdown) => {
    if (dropdown.hasAttribute("data-initialized")) return;
    dropdown.setAttribute("data-initialized", "true");

    const trigger = dropdown.querySelector(
      "[data-dropdown-trigger]",
    ) as HTMLElement;
    const content = dropdown.querySelector(
      "[data-dropdown-content]",
    ) as HTMLElement;

    if (!trigger || !content) return;

    if (!content.id) {
      content.id = generateId("dropdown-menu");
    }

    trigger.setAttribute("aria-haspopup", "true");
    trigger.setAttribute("aria-controls", content.id);

    const items = () =>
      Array.from(
        content.querySelectorAll("[data-dropdown-item]:not([disabled])"),
      ) as HTMLElement[];
    let focusedIndex = -1;

    const openDropdown = () => {
      content.hidden = false;
      trigger.setAttribute("aria-expanded", "true");
      trigger.setAttribute("data-state", "open");

      const side = content.dataset.side;
      if (side === "left" || side === "right") {
        const triggerRect = trigger.getBoundingClientRect();
        content.style.position = "fixed";
        content.style.top = `${triggerRect.top}px`;

        if (side === "left") {
          content.style.right = `${window.innerWidth - triggerRect.left + 8}px`;
          content.style.left = "auto";
        } else {
          content.style.left = `${triggerRect.right + 8}px`;
          content.style.right = "auto";
        }
      }

      const menuItems = items();
      if (menuItems.length > 0) {
        focusedIndex = 0;
        menuItems[0].focus();
      }
    };

    const closeDropdown = () => {
      content.hidden = true;
      trigger.setAttribute("aria-expanded", "false");
      trigger.setAttribute("data-state", "closed");
      focusedIndex = -1;

      const side = content.dataset.side;
      if (side === "left" || side === "right") {
        content.style.position = "";
        content.style.top = "";
        content.style.left = "";
        content.style.right = "";
      }

      trigger.focus();
    };

    const toggleDropdown = () => {
      if (content.hidden) {
        openDropdown();
      } else {
        closeDropdown();
      }
    };

    trigger.addEventListener("click", toggleDropdown);

    trigger.addEventListener("keydown", (e) => {
      const event = e as KeyboardEvent;
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        toggleDropdown();
      } else if (event.key === "ArrowDown" && content.hidden) {
        event.preventDefault();
        openDropdown();
      }
    });

    content.addEventListener("keydown", (e) => {
      const menuItems = items();
      if (menuItems.length === 0) return;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          focusedIndex = (focusedIndex + 1) % menuItems.length;
          menuItems[focusedIndex].focus();
          break;
        case "ArrowUp":
          e.preventDefault();
          focusedIndex =
            (focusedIndex - 1 + menuItems.length) % menuItems.length;
          menuItems[focusedIndex].focus();
          break;
        case "Home":
          e.preventDefault();
          focusedIndex = 0;
          menuItems[0].focus();
          break;
        case "End":
          e.preventDefault();
          focusedIndex = menuItems.length - 1;
          menuItems[focusedIndex].focus();
          break;
        case "Escape":
          e.preventDefault();
          closeDropdown();
          break;
        case "Tab":
          closeDropdown();
          break;
      }
    });

    document.addEventListener("click", (e) => {
      if (!dropdown.contains(e.target as Node) && !content.hidden) {
        closeDropdown();
      }
    });

    content.querySelectorAll("[data-dropdown-item]").forEach((item) => {
      item.addEventListener("click", () => {
        if (!dropdown.hasAttribute("data-dropdown-keep-open")) {
          closeDropdown();
        }
      });
    });
  });
}
