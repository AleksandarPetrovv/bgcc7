export { cn } from "cn"

/** inline css custom properties (--d, --i, --s …) without a cast at every call */
export const cssVars = (o: Record<string, string | number>) => o as React.CSSProperties;

/** the promise's value, or null once ms have passed */
export const within = <T,>(p: Promise<T>, ms: number) => Promise.race([p, new Promise<null>((r) => setTimeout(() => r(null), ms))]);
