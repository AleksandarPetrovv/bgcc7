import type { Metadata } from "next";
import { drawFeed } from "@/db/draw";
import { getDict } from "@/lib/i18n/server";
import { DrawLive } from "@/components/site/draw/draw-live";
import { DrawNote } from "@/components/site/draw/draw-stage";
import { DrawThanks } from "./thanks";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getDict()).wheel.title };
}

export default async function Draw() {
  const [t, feed] = await Promise.all([getDict(), drawFeed()]);
  return <DrawLive initial={feed} wordmark thanks={<DrawThanks />} closed={<DrawNote>{t.wheel.closed(t.admin.phases.seeding)}</DrawNote>} />;
}
