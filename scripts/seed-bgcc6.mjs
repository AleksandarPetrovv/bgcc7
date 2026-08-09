import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { staff, users } from "../src/db/schema.ts";
import staffJson from "../src/data/staff.json" with { type: "json" };

const client = postgres(process.env.DATABASE_URL, { max: 1 });
const db = drizzle(client);

const idOf = (url) => Number(/users\/(\d+)/.exec(url)?.[1]);

async function seedStaff() {
  const people = new Map();
  for (const p of [...staffJson.organizational, ...staffJson.assistive]) {
    const id = idOf(p.osuProfile);
    if (!id) continue;
    const prev = people.get(id);
    people.set(id, { ...p, id, roles: [...new Set([...(prev?.roles ?? []), ...p.roles])] });
  }
  let i = 0;
  for (const p of people.values()) {
    await db
      .insert(users)
      .values({ osuId: p.id, username: p.username, avatarUrl: p.picture, country: p.country.toUpperCase() })
      .onConflictDoNothing();
    await db.insert(staff).values({ osuId: p.id, displayRoles: p.roles, order: i++ }).onConflictDoNothing();
  }
  console.log(`staff: ${people.size}`);
}

await seedStaff();
await client.end();
