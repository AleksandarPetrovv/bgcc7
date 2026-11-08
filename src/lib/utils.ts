export { cn } from "cn"

export const cssVars = (o: Record<string, string | number>) => o as React.CSSProperties;

export const within = <T,>(p: Promise<T>, ms: number) => Promise.race([p, new Promise<null>((r) => setTimeout(() => r(null), ms))]);
