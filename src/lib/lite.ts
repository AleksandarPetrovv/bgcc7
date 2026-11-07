/** html class + sessionStorage key for lite mode (software rendering or a slow frame rate), set by the boot script in app/layout.tsx */
export const LITE = "lite";
export const isLite = () => document.documentElement.classList.contains(LITE);
