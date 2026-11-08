// fonts or this cap, whichever first, measured from DOMContentLoaded; a slow font must not hold the intro back
export const FONTS_CAP_MS = 1000;

const FONTS_KEY = "__fontsReady";

declare global {
  interface Window {
    __fontsReady?: Promise<unknown>;
  }
}

// inline head script: makes the once-per-page promise and ends the data-booting animation pause
export const BOOT = `var h=document.documentElement;h.setAttribute("data-booting","");window.${FONTS_KEY}=new Promise(function(d){addEventListener("DOMContentLoaded",function(){Promise.race([document.fonts.ready,new Promise(function(r){setTimeout(r,${FONTS_CAP_MS})})]).then(d)})});window.${FONTS_KEY}.then(function(){requestAnimationFrame(function(){h.removeAttribute("data-booting")})});`;

export const fontsReady = (): Promise<unknown> => window.__fontsReady ?? Promise.resolve();
