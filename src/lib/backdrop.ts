import type { MouseEvent, PointerEvent } from "react";

// close only when the press both starts and ends on the backdrop itself, so dragging out of the popup (e.g. selecting text) keeps it open
export const backdropClose = (close: () => void) => ({
  onPointerDown: (e: PointerEvent<HTMLElement>) => {
    e.currentTarget.dataset.down = e.target === e.currentTarget ? "1" : "";
  },
  onClick: (e: MouseEvent<HTMLElement>) => {
    const down = e.currentTarget.dataset.down === "1";
    e.currentTarget.dataset.down = "";
    if (down && e.target === e.currentTarget) close();
  },
});
