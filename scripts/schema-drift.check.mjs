import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const src = readFileSync(new URL("../src/db/shared-tables.ts", import.meta.url), "utf8");
const shared = new Set([...src.match(/SHARED_TABLES\s*=\s*\[([^\]]*)\]/)[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]));

const sql = `select coalesce(json_agg(json_build_object('s', table_schema, 't', table_name, 'c', column_name, 'type', data_type, 'null', is_nullable, 'def', column_default)), '[]')
from information_schema.columns where table_schema in ('public', 'bgcc7')`;

let rows;
if (process.argv.includes("--psql")) {
  const out = execFileSync("docker", ["compose", "exec", "-T", "db", "sh", "-c", 'psql -U "$POSTGRES_USER" -d "${POSTGRES_DB:-$POSTGRES_USER}" -At -v ON_ERROR_STOP=1'], {
    cwd: new URL("../../host/", import.meta.url),
    input: sql,
    encoding: "utf8",
  });
  rows = JSON.parse(out);
} else {
  if (!process.env.DATABASE_URL) throw new Error("set DATABASE_URL or pass --psql");
  const { default: postgres } = await import("postgres");
  const pg = postgres(process.env.DATABASE_URL, { max: 1 });
  rows = (await pg.unsafe(sql))[0].coalesce;
  await pg.end();
}

const bySchema = { public: new Map(), bgcc7: new Map() };
for (const r of rows) {
  if (shared.has(r.t)) continue;
  const cols = bySchema[r.s].get(r.t) ?? new Map();
  bySchema[r.s].set(r.t, cols);
  cols.set(r.c, { type: r.type, null: r.null, def: r.def });
}

const drift = [];
const { public: a, bgcc7: b } = bySchema;
for (const t of new Set([...a.keys(), ...b.keys()])) {
  if (!a.has(t) || !b.has(t)) {
    drift.push(`${t}: table only in ${a.has(t) ? "public" : "bgcc7"}`);
    continue;
  }
  const ca = a.get(t), cb = b.get(t);
  for (const c of new Set([...ca.keys(), ...cb.keys()])) {
    const x = ca.get(c), y = cb.get(c);
    if (!x || !y) drift.push(`${t}.${c}: column only in ${x ? "public" : "bgcc7"}`);
    else for (const k of ["type", "null", "def"]) if (x[k] !== y[k]) drift.push(`${t}.${c}: ${k} public=${x[k]} bgcc7=${y[k]}`);
  }
}

for (const d of drift.sort()) console.log(d);
console.log(drift.length ? `drift: ${drift.length} difference(s)` : "ok: public and bgcc7 match (shared tables skipped)");
process.exit(drift.length ? 1 : 0);
