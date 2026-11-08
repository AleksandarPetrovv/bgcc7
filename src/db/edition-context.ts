import "server-only";
import { AsyncLocalStorage } from "node:async_hooks";
import { workUnitAsyncStorage } from "next/dist/server/app-render/work-unit-async-storage.external";
import { bootedEdition } from "@/lib/boot";
import { globalStore } from "@/lib/global-store";
import type { Edition } from "@/lib/format";

export const EDITION_COOKIE = "edition";
const pin = globalStore("bgccPin", () => new AsyncLocalStorage<Edition | "site">());

export const siteEdition = (): Edition => bootedEdition() ?? "bgcc7";

let storeMissing = false;
// cookies() is async and throws outside a request, so this sync read of the request store has no public equivalent
const viewEdition = (): Edition | null => {
  if (typeof workUnitAsyncStorage?.getStore !== "function") {
    if (!storeMissing) console.error("[db] next workUnitAsyncStorage is missing, the bgcc6 cookie view is off; the import path moved in a next upgrade");
    storeMissing = true;
    return null;
  }
  const store = workUnitAsyncStorage.getStore();
  if (store?.type !== "request") return null;
  const v = store.cookies.get(EDITION_COOKIE)?.value;
  return v === "bgcc6" || v === "bgcc7" ? v : null;
};

export const currentEdition = (): Edition => {
  const p = pin.getStore();
  if (p) return p === "site" ? siteEdition() : p;
  return viewEdition() ?? siteEdition();
};

/** the one check for "is this request about bgcc6". every bgcc6-only branch goes through it, so dropping bgcc6 = delete this and fix what stops compiling */
export const isBGCC6 = () => currentEdition() === "bgcc6";

export const withEdition = <T>(ed: Edition | "site", fn: () => T): T => pin.run(ed, fn);

/** per-edition key for maps that hold match ids */
export const editionKey = (id: string | number, ed: Edition = currentEdition()) => `${ed}:${id}`;
