export type FloatingSide = "top" | "right" | "bottom" | "left";
export type FloatingAlign = "start" | "center" | "end";

export interface FloatingOptions {
  side?: FloatingSide;
  align?: FloatingAlign;
  /** Gap between the trigger and the floating element, in px. */
  offset?: number;
  /** Minimum distance kept from the viewport edges, in px. */
  padding?: number;
}

const OPPOSITE: Record<FloatingSide, FloatingSide> = {
  top: "bottom",
  bottom: "top",
  left: "right",
  right: "left",
};

function roomOnSide(side: FloatingSide, rect: DOMRect): number {
  switch (side) {
    case "top":
      return rect.top;
    case "bottom":
      return window.innerHeight - rect.bottom;
    case "left":
      return rect.left;
    case "right":
      return window.innerWidth - rect.right;
  }
}

/**
 * Positions `content` relative to `trigger` using `position: fixed`, so it
 * escapes `overflow` clipping. Flips to the opposite side when the preferred
 * side lacks room, and shifts along the alignment axis to stay inside the
 * viewport. Repositions on scroll and resize while visible.
 *
 * Returns a cleanup function — call it when the floating element is hidden.
 */
export function positionFloating(
  trigger: HTMLElement,
  content: HTMLElement,
  options: FloatingOptions = {},
): () => void {
  const { side = "bottom", align = "center", offset = 8, padding = 8 } = options;

  const compute = () => {
    // Take the content out of normal flow *before* measuring — while
    // statically positioned it occupies flow space and can shift the
    // trigger itself, skewing every measurement below.
    content.style.position = "fixed";

    const rect = trigger.getBoundingClientRect();

    // Expose the trigger width so content can match it
    // (e.g. w-[var(--trigger-width)] on combobox lists).
    content.style.setProperty("--trigger-width", `${rect.width}px`);

    const width = content.offsetWidth;
    const height = content.offsetHeight;

    // Flip when the preferred side can't fit the content but the opposite can
    let resolvedSide = side;
    const needed = (side === "top" || side === "bottom" ? height : width) + offset + padding;
    if (roomOnSide(side, rect) < needed && roomOnSide(OPPOSITE[side], rect) > roomOnSide(side, rect)) {
      resolvedSide = OPPOSITE[side];
    }

    let top: number;
    let left: number;

    if (resolvedSide === "top" || resolvedSide === "bottom") {
      top = resolvedSide === "top" ? rect.top - height - offset : rect.bottom + offset;
      if (align === "start") left = rect.left;
      else if (align === "end") left = rect.right - width;
      else left = rect.left + rect.width / 2 - width / 2;
    } else {
      left = resolvedSide === "left" ? rect.left - width - offset : rect.right + offset;
      if (align === "start") top = rect.top;
      else if (align === "end") top = rect.bottom - height;
      else top = rect.top + rect.height / 2 - height / 2;
    }

    // Shift to stay inside the viewport
    left = Math.min(Math.max(left, padding), window.innerWidth - width - padding);
    top = Math.min(Math.max(top, padding), window.innerHeight - height - padding);

    content.style.top = `${top}px`;
    content.style.left = `${left}px`;
    content.style.right = "auto";
    content.style.bottom = "auto";
    content.setAttribute("data-side", resolvedSide);
    content.setAttribute("data-align", align);
  };

  compute();

  // capture: true so scrolls inside nested scroll containers also reposition
  const scrollOptions = { capture: true, passive: true } as const;
  window.addEventListener("scroll", compute, scrollOptions);
  window.addEventListener("resize", compute);

  // Inline positioning styles are intentionally left in place: they're
  // inert once the element is hidden, compute() rewrites them on the next
  // open, and clearing them here would make exit animations jump.
  return () => {
    window.removeEventListener("scroll", compute, scrollOptions);
    window.removeEventListener("resize", compute);
  };
}
