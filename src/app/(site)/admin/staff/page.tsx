import { notFound } from "next/navigation";
import { getRegistrations } from "@/db/registrations";
import { Words } from "@/components/site/rich";
import { PageTitle } from "@/components/site/page";
import { ActionForm, inputCls, Panel, Field } from "@/components/admin/form";
import { getStaff } from "@/db/admin";
import { getViewer } from "@/lib/authz";
import { getDict } from "@/lib/i18n/server";
import { can } from "@/lib/roles";
import { addStaff } from "./actions";
import { StaffList } from "./staff-list";

export default async function AdminStaff() {
  const [t, viewer, rows, regs] = await Promise.all([getDict(), getViewer(), getStaff(), getRegistrations()]);
  const playing = new Set(regs.filter((r) => r.status !== "denied").map((r) => r.osuId));
  const clash = (s: (typeof rows)[number]) => playing.has(s.osuId) && s.permRoles.length > 0;
  if (!can(viewer?.roles, "staff")) notFound();
  return (
    <>
      <PageTitle>{t.admin.menu.staff}</PageTitle>
      <p className="-mt-4 mb-8 max-w-2xl text-sm text-ash">
        <Words text={t.admin.staffHelp} d={0.15} s={0.012} />
      </p>

      <Panel title={t.admin.addStaff} className="mb-6">
        <ActionForm action={addStaff} submit={t.admin.add} className="flex items-center gap-3">
          <Field name="q" required maxLength={32} placeholder={t.admin.addPlaceholder} className={`${inputCls} flex-1 sm:max-w-sm`} aria-label={t.admin.addPlaceholder} />
        </ActionForm>
      </Panel>

      <StaffList
        key={rows.map((s) => `${s.osuId}:${s.permRoles.join("+")}`).join()}
        rows={rows.map((s) => ({
          osuId: s.osuId,
          username: s.username,
          avatarUrl: s.avatarUrl,
          country: s.country,
          permRoles: s.permRoles,
          clash: clash(s),
        }))}
      />
    </>
  );
}
