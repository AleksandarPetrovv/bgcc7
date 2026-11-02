// every public page's requireSection("…") must name the section lib/sections.ts maps its route to; exits 1 on a mismatch
// run: node scripts/sections.check.mjs
import { readFileSync, readdirSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../src/", import.meta.url));
const routes = ["lib/sections.ts", "lib/sections-bgcc6.ts"].flatMap((f) => [...readFileSync(join(root, f), "utf8").matchAll(/\["(\/[^"]*)", "(\w+)"\]/g)].map((m) => [m[1], m[2]]));
const sectionOf = (path) => routes.find(([p]) => path === p || path.startsWith(`${p}/`))?.[1] ?? null;

const pages = [];
const walk = (dir) => {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (e.name === "page.tsx") pages.push(p);
  }
};
const site = join(root, "app", "(site)");
walk(site);

let bad = 0;
for (const file of pages) {
  const route = "/" + relative(site, file).split(sep).slice(0, -1).filter((s) => !/^\(.*\)$/.test(s)).join("/");
  const want = sectionOf(route);
  const got = [...readFileSync(file, "utf8").matchAll(/requireSection\("(\w+)"\)/g)].map((m) => m[1]);
  if (got.some((g) => g !== want) || (want && !got.length && !/^\/(matches|results)\/\[/.test(route))) {
    console.log(`${route}: requireSection ${got.length ? got.join(",") : "missing"}, route table says ${want ?? "none"}`);
    bad++;
  }
}
console.log(bad ? `${bad} mismatch(es)` : `ok, ${pages.length} pages`);
process.exit(bad ? 1 : 0);
