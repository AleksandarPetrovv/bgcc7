import "server-only";
import { createReadStream, createWriteStream, type WriteStream } from "node:fs";
import { mkdir, open, readFile, rename, rm, stat } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import type { ReadableStream as WebStream } from "node:stream/web";
import { crc32 } from "node:zlib";
import { revalidatePath } from "next/cache";
import { asc, eq } from "drizzle-orm";
import { currentEdition, db6, db7 } from "@/db";
import type { Edition } from "@/lib/format";
import { maps as mapsTable, stages } from "@/db/schema";
import { MOD_ORDER, slotOf } from "@/db/mappools";
import { getSkillLayouts } from "@/db/format-plan";
import { skillSlot } from "./format-plan";
import { log } from "./authz";
import { getBeatmap } from "./osu-api";
import { PACK_MAX, UPLOAD_DIR, packPath } from "./uploads";

export type PackJob = {
  state: "running" | "done" | "error";
  done: number;
  total: number;
  missing: string[];
  error?: string;
  size?: number;
  zipping?: boolean;
  at: number;
};

const UA = "bgcc7-mappack/1.0";
const MAP_MAX = 200 * 1024 * 1024;
const PARALLEL = 6;
const MIRRORS = [
  (id: number) => `https://catboy.best/d/${id}`,
  (id: number) => `https://osu.direct/api/d/${id}`,
  (id: number) => `https://api.nerinyan.moe/d/${id}`,
  (id: number) => `https://beatconnect.io/b/${id}/`,
];

const g = globalThis as unknown as { packJobs?: Map<string, PackJob>; packSlots?: { free: number; queue: (() => void)[] } };
const jobs = (g.packJobs ??= new Map());
const slots = (g.packSlots ??= { free: PARALLEL, queue: [] });

export const packJob = (slug: string, ed: Edition = currentEdition()) => jobs.get(`${ed}:${slug}`) ?? null;
export const packJobs = (ed: Edition = currentEdition()) =>
  Object.fromEntries([...jobs].filter(([k]) => k.startsWith(`${ed}:`)).map(([k, j]) => [k.slice(ed.length + 1), j]));

async function withSlot<T>(fn: () => Promise<T>) {
  if (slots.free > 0) slots.free--;
  else await new Promise<void>((resolve) => slots.queue.push(resolve));
  try {
    return await fn();
  } finally {
    const next = slots.queue.shift();
    if (next) next();
    else slots.free++;
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const setIdOf = async (beatmapId: number, cover: string) => {
  const m = /\/beatmaps\/(\d+)\//.exec(cover);
  if (m) return Number(m[1]);
  const b = await getBeatmap(beatmapId).catch(() => null);
  const fromApi = b && /\/beatmaps\/(\d+)\//.exec(b.beatmapset.covers.cover);
  return fromApi ? Number(fromApi[1]) : null;
};

const clean = (s: string) => s.replace(/[\\/:*?"<>|\x00-\x1f]/g, "").replace(/\s+/g, " ").trim().slice(0, 120);

async function fetchMirror(url: string) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(url, { headers: { "user-agent": UA }, redirect: "follow", signal: AbortSignal.timeout(180_000) });
    if (res.status !== 429 && res.status < 500) return res;
    await res.body?.cancel().catch(() => {});
    await sleep(1500 * (attempt + 1));
  }
  return null;
}

async function download(setId: number, dest: string) {
  for (const url of MIRRORS) {
    try {
      const res = await fetchMirror(url(setId));
      if (!res?.ok || !res.body) {
        await res?.body?.cancel().catch(() => {});
        continue;
      }
      if (Number(res.headers.get("content-length") ?? 0) > MAP_MAX) continue;
      let size = 0;
      const body = Readable.fromWeb(res.body as unknown as WebStream).on("data", (c: Buffer) => {
        size += c.length;
        if (size > MAP_MAX) body.destroy(new Error("tooBig"));
      });
      await pipeline(body, createWriteStream(dest));
      const fh = await open(dest, "r");
      const head = Buffer.alloc(2);
      await fh.read(head, 0, 2, 0);
      await fh.close();
      if (size > 22 && head.toString("latin1") === "PK") return true;
    } catch {}
    await rm(dest, { force: true });
  }
  return false;
}

function write(out: WriteStream, buf: Buffer) {
  return new Promise<void>((resolve, reject) => out.write(buf, (e) => (e ? reject(e) : resolve())));
}

async function zipStore(files: { name: string; file: string }[], dest: string) {
  const out = createWriteStream(dest);
  const central: Buffer[] = [];
  let offset = 0;
  for (const f of files) {
    const data = await readFile(f.file);
    const name = Buffer.from(f.name, "utf8");
    const crc = crc32(data) >>> 0;
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x0800, 6);
    local.writeUInt16LE(0, 8);
    local.writeUInt32LE(0, 10);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(name.length, 26);
    local.writeUInt16LE(0, 28);
    await write(out, local);
    await write(out, name);
    await write(out, data);
    const cd = Buffer.alloc(46);
    cd.writeUInt32LE(0x02014b50, 0);
    cd.writeUInt16LE(20, 4);
    cd.writeUInt16LE(20, 6);
    cd.writeUInt16LE(0x0800, 8);
    cd.writeUInt16LE(0, 10);
    cd.writeUInt32LE(0, 12);
    cd.writeUInt32LE(crc, 16);
    cd.writeUInt32LE(data.length, 20);
    cd.writeUInt32LE(data.length, 24);
    cd.writeUInt16LE(name.length, 28);
    cd.writeUInt32LE(offset, 42);
    central.push(cd, name);
    offset += local.length + name.length + data.length;
  }
  const dir = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(dir.length, 12);
  end.writeUInt32LE(offset, 16);
  await write(out, dir);
  await write(out, end);
  await new Promise<void>((resolve, reject) => out.end((e?: Error | null) => (e ? reject(e) : resolve())));
  return offset + dir.length + end.length;
}

async function build(slug: string, osuId: number, job: PackJob, ed: Edition) {
  const work = path.join(UPLOAD_DIR, "tmp", `${ed}-${slug.replace(/[^\w-]/g, "")}-${Date.now()}`);
  const db = ed === "bgcc7" ? db7 : db6;
  try {
    const [stage] = await db.select().from(stages).where(eq(stages.slug, slug)).limit(1);
    if (!stage) throw new Error("notFound");
    const rows = await db.select().from(mapsTable).where(eq(mapsTable.stageId, stage.id)).orderBy(asc(mapsTable.order), asc(mapsTable.id));
    const layout = ed === currentEdition() ? (await getSkillLayouts())?.[slug] : null;
    const label = (mod: string, order: number) => skillSlot(layout, mod, order)?.label ?? slotOf(mod, order);
    const maps = layout
      ? layout.groups.flatMap((g) => g.slots.flatMap((s) => rows.filter((r) => r.mod === s.mod && r.order === s.slot).map((r) => ({ ...r, slot: s.label }))))
      : MOD_ORDER.flatMap((mod) => rows.filter((r) => r.mod === mod).map((r) => ({ ...r, slot: label(mod, r.order) })));
    if (!maps.length) throw new Error("empty");

    const sets: { setId: number; slot: string; name: string }[] = [];
    for (const m of maps) {
      const setId = await setIdOf(m.beatmapId, m.cover);
      if (!setId) {
        job.missing.push(m.slot);
        continue;
      }
      const hit = sets.find((s) => s.setId === setId);
      if (hit) hit.slot += `+${m.slot}`;
      else sets.push({ setId, slot: m.slot, name: clean(`${m.artist ? `${m.artist} - ` : ""}${m.title}`) });
    }
    job.total = sets.length;
    await mkdir(work, { recursive: true });

    const got = new Map<number, string>();
    await Promise.all(
      sets.map((s) =>
        withSlot(async () => {
          const file = path.join(work, `${s.setId}.osz`);
          if (await download(s.setId, file)) got.set(s.setId, file);
          else job.missing.push(s.slot);
          job.done++;
        }),
      ),
    );
    if (job.missing.length) throw new Error("missing");
    job.zipping = true;

    const dest = packPath(slug, ed);
    await rm(dest, { force: true });
    await db.update(stages).set({ packSize: null, packAt: null }).where(eq(stages.id, stage.id));

    // A number first, so osu! imports the maps in pool order whatever the slot names sort as.
    const files = sets.map((s, i) => ({ name: `${String(i + 1).padStart(2, "0")} ${s.slot} - ${s.name} (${s.setId}).osz`, file: got.get(s.setId)! }));
    const tmpZip = path.join(work, "pack.zip");
    const size = await zipStore(files, tmpZip);
    if (size > PACK_MAX) throw new Error("tooBig");
    await mkdir(path.dirname(dest), { recursive: true });
    await rename(tmpZip, dest).catch(async () => {
      await pipeline(createReadStream(tmpZip), createWriteStream(dest));
    });
    const real = (await stat(dest)).size;
    job.size = real;
    await db.update(stages).set({ packSize: real, packAt: new Date() }).where(eq(stages.id, stage.id));
    await log(osuId, "pack.generate", { stage: stage.title, size: real, maps: sets.length });
    job.state = "done";
  } catch (e) {
    job.state = "error";
    job.error = e instanceof Error ? e.message : "failed";
    console.error("[pack generate]", slug, e);
  } finally {
    job.at = Date.now();
    await rm(work, { recursive: true, force: true }).catch(() => {});
    try {
      revalidatePath("/", "layout");
    } catch {}
  }
}

export function startPackJob(slug: string, osuId: number, ed: Edition = currentEdition()) {
  const key = `${ed}:${slug}`;
  const running = jobs.get(key);
  if (running?.state === "running") return running;
  const idle = ![...jobs.values()].some((j) => j.state === "running");
  const job: PackJob = { state: "running", done: 0, total: 0, missing: [], at: Date.now() };
  jobs.set(key, job);
  const sweep = idle ? rm(path.join(UPLOAD_DIR, "tmp"), { recursive: true, force: true }).catch(() => {}) : Promise.resolve();
  void sweep.then(() => build(slug, osuId, job, ed));
  return job;
}
