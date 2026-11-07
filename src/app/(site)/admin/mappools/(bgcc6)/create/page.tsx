import { notFound, redirect } from "next/navigation";
import { LinkTabs } from "@/components/site/tabs";
import { PageTitle } from "@/components/site/page";
import { getPoolStages } from "@/db/mappools";
import { getViewer } from "@/lib/authz";
import { getDict } from "@/lib/i18n/server";
import { can } from "@/lib/roles";
import { saveBlueprint } from "../../actions";
import { BlueprintForm } from "./blueprint-form";
import { isBGCC6 } from "@/db";
import { roundName } from "@/lib/i18n/dict";
import { MOD_ORDER } from "@/lib/mods";

export default async function PoolCreate({ searchParams }: { searchParams: Promise<{ stage?: string }> }) {
  const [t, viewer, stages, sp] = await Promise.all([getDict(), getViewer(), getPoolStages(), searchParams]);
  if (!can(viewer?.roles, "phase")) notFound();
  if (!isBGCC6()) redirect("/admin/format");
  const stage = stages.find((s) => s.slug === sp.stage) ?? stages[0];
  if (!stage) return null;
  const quals = stage.slug === "qualifiers";
  const mods = MOD_ORDER.filter((m) => m !== "Tiebreaker" && !(quals && m === "FreeMod"));

  return (
    <>
      <PageTitle mark="notes">{t.admin.poolCreate}</PageTitle>
      <LinkTabs
        className="mb-6"
        label={t.admin.menu.mappools}
        items={stages.map((s) => ({ href: `/admin/mappools/create?stage=${s.slug}`, active: s.id === stage.id, label: roundName(t, s.title) }))}
      />
      <BlueprintForm key={stage.id} action={saveBlueprint.bind(null, stage.id)} mods={mods} initial={stage.blueprint} tb={!quals} />
    </>
  );
}
