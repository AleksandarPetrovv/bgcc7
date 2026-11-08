import { useSyncExternalStore } from "react";

const noop = () => () => {};

export const useMounted = () => useSyncExternalStore(noop, () => true, () => false);
