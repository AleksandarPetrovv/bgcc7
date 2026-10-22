import { readFileSync, writeFileSync } from "node:fs";

const root = new URL("../", import.meta.url);
const css = readFileSync(new URL("src/app/styles/palette.css", root), "utf8");

const ink = css.match(/--ink:\s*(#[0-9a-f]{6})/i)?.[1];
if (!ink) throw new Error("palette.css: --ink must be a 6 digit hex (the ref app window background uses it)");
const conf = new URL("helper/src-tauri/tauri.conf.json", root);
const json = readFileSync(conf, "utf8");
writeFileSync(conf, json.replace(/("backgroundColor":\s*")#[0-9a-f]{6}(")/i, `$1${ink}$2`));
console.log("helper window color synced");
