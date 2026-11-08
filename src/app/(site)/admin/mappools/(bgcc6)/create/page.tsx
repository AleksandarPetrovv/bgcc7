import { notFound, redirect } from "next/navigation";
import { LinkTabs } from "@/components/site/tabs";
import { PageTitle } from "@/components/site/page-title";
import { getPoolStages } from "@/db/mappools";
import { getViewer } from "@/lib/authz";
import { getDict } from "@/lib/i18n/server";
import { can } from "@/lib/roles";
import { saveBlueprint } from "./actions";
import { BlueprintForm } from "./blueprint-form";
import { isBGCC6 } from "@/db";
import { roundName } from "@/lib/i18n/dict";
import { isBracketStage } from "@/lib/format";
import { blueprintMods } from "./blueprint";

export default async function PoolCreate({ searchParams }: { searchParams: Promise<{ stage?: string }> }) {
  const [t, viewer, stages, sp] = await Promise.all([getDict(), getViewer(), getPoolStages(), searchParams]);
  if (!can(viewer?.roles, "host")) notFound();
  if (!isBGCC6()) redirect("/admin/format");
  const stage = stages.find((s) => s.slug === sp.stage) ?? stages[0];
  if (!stage) return null;

  return (
    <>
      <PageTitle mark="notes">{t.admin.poolCreate}</PageTitle>
      <LinkTabs
        className="mb-6"
        label={t.admin.menu.mappools}
        items={stages.map((s) => ({ href: `/admin/mappools/create?stage=${s.slug}`, active: s.id === stage.id, label: roundName(t, s.title) }))}
      />
      <BlueprintForm key={stage.id} action={saveBlueprint.bind(null, stage.id)} mods={blueprintMods(stage.slug)} initial={stage.blueprint} tb={isBracketStage(stage.slug)} />
    </>
  );
}
