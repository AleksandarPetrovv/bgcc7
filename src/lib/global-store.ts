const slots = globalThis as unknown as Record<string, unknown>;

/** one instance per key on globalThis, so dev reloads and every route bundle share it */
export function globalStore<T>(key: string, init: () => T): T {
  return (slots[key] ??= init()) as T;
}

export const peekStore = <T>(key: string) => slots[key] as T | undefined;
