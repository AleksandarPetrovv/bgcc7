// fonts or this cap, whichever first, measured from DOMContentLoaded; a slow font must not hold the intro back
export const FONTS_CAP_MS = 1000;

declare global {
  interface Window {
    __fontsReady?: Promise<unknown>;
  }
}

// the promise is made once per page by BOOT in app/layout.tsx; it also ends the data-booting animation pause
export const fontsReady = (): Promise<unknown> => window.__fontsReady ?? Promise.resolve();
