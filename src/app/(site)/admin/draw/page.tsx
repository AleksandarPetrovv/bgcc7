import { forbidden, notFound } from "next/navigation";
import { PageTitle } from "@/components/site/page-title";
import { DrawNote } from "@/components/site/draw/draw-stage";
import { drawFeed } from "@/db/draw";
import { getViewer } from "@/lib/authz";
import { getDict } from "@/lib/i18n/server";
import { can } from "@/lib/roles";
import { isBGCC6 } from "@/db";
import { DrawControls } from "./controls";

export const dynamic = "force-dynamic";

export default async function AdminDraw() {
  const [t, viewer, feed] = await Promise.all([getDict(), getViewer(), drawFeed()]);
  if (isBGCC6()) notFound();
  if (!can(viewer?.roles, "host")) forbidden();
  return (
    <>
      <PageTitle mark="team">{t.admin.menu.draw}</PageTitle>
      <DrawControls initial={feed} closed={<DrawNote>{t.wheel.closed(t.admin.phases.seeding)}</DrawNote>} />
    </>
  );
}
