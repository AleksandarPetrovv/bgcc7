import { notFound } from "next/navigation";
import { PageTitle } from "@/components/site/page";
import { getPlan } from "@/db/format-plan";
import { getViewer } from "@/lib/authz";
import { getDict } from "@/lib/i18n/server";
import { can } from "@/lib/roles";
import { FormatEditor } from "./format-editor";

export const dynamic = "force-dynamic";

export default async function AdminFormat() {
  const [t, viewer, plan] = await Promise.all([getDict(), getViewer(), getPlan()]);
  if (!can(viewer?.roles, "format")) notFound();
  return (
    <>
      <PageTitle mark="bars">{t.admin.menu.format}</PageTitle>
      <FormatEditor initial={plan} edit={can(viewer?.roles, "settings")} />
    </>
  );
}
