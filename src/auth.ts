import NextAuth from "next-auth";
import type { OAuthConfig } from "next-auth/providers";
import { eq, sql } from "drizzle-orm";
import { db, db6, db7 } from "@/db";
import { lobbies, matches, userNames, users } from "@/db/schema";

type OsuProfile = { id: number; username: string; avatar_url: string; country_code: string };

const osu: OAuthConfig<OsuProfile> = {
  id: "osu",
  name: "osu!",
  type: "oauth",
  authorization: "https://osu.ppy.sh/oauth/authorize?scope=identify",
  token: "https://osu.ppy.sh/oauth/token",
  userinfo: "https://osu.ppy.sh/api/v2/me",
  clientId: process.env.AUTH_OSU_ID,
  clientSecret: process.env.AUTH_OSU_SECRET,
  profile: (p) => ({ id: String(p.id), name: p.username, image: p.avatar_url, email: null }),
};

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [osu],
  session: { strategy: "jwt" },
  callbacks: {
    async signIn({ profile }) {
      const p = profile as unknown as OsuProfile | undefined;
      if (!p?.id) return false;
      const row = { username: p.username, avatarUrl: p.avatar_url, country: p.country_code, updatedAt: new Date() };
      const [old] = await db.select({ username: users.username }).from(users).where(eq(users.osuId, p.id)).limit(1);
      await db.insert(users).values({ osuId: p.id, ...row }).onConflictDoUpdate({ target: users.osuId, set: row });
      // ref assignments are stored by name, so carry them over an osu! rename in both editions
      if (old && old.username !== p.username)
        for (const d of [db6, db7])
          for (const t of [matches, lobbies]) await d.update(t).set({ referee: p.username }).where(sql`lower(trim(${t.referee})) = ${old.username.toLowerCase()}`);
      await db.insert(userNames).values({ osuId: p.id, username: p.username }).onConflictDoNothing();
      return true;
    },
    jwt({ token, account }) {
      if (account?.provider === "osu") token.osuId = account.providerAccountId;
      return token;
    },
    session({ session, token }) {
      if (typeof token.osuId === "string") session.user.id = token.osuId;
      return session;
    },
  },
});

export async function currentOsuId() {
  const s = await auth();
  const id = Number(s?.user?.id);
  return Number.isInteger(id) && id > 0 ? id : null;
}
