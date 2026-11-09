/** dialog initialFocus: a keyboard open keeps the default (first control); a mouse/touch open focuses the first text field, else the popup itself, so no focus ring lands on a link or button nobody tabbed to */
export const quietFocus = (type: string, popup: HTMLElement | null) =>
  type === "keyboard" || !popup ? true : (popup.querySelector<HTMLElement>("input:not([type=hidden]):not([tabindex='-1']), textarea") ?? popup);
