import "server-only";
import { currentEdition } from "./index";
import { FORMATS } from "@/lib/format";

export const getEdition = () => currentEdition();
export const getFormat = () => FORMATS[currentEdition()];
