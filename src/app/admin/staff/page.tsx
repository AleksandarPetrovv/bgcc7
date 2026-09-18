import { notFound } from "next/navigation";
import { getRegistrations } from "@/db/registrations";
import { Words } from "@/components/site/rich";
import { PageTitle } from "@/components/site/page";
import { ActionForm, inputCls, Panel } from "@/components/admin/form";
import { getStaff } from "@/db/admin";
import { getViewer } from "@/lib/authz";
import { ADMINS } from "@/lib/admins";
import { getDict } from "@/lib/i18n/server";
import { can } from "@/lib/roles";
import { addStaff } from "./actions";
import { StaffList } from "./staff-list";

export default async function AdminStaff() {
  const [t, viewer, rows, regs] = await Promise.all([getDict(), getViewer(), getStaff(), getRegistrations()]);
  const playing = new Set(regs.filter((r) => r.status !== "denied").map((r) => r.osuId));
  const CAN_PLAY = ["Streamer", "Commentator", "GFX / Designer"];
  const clash = (s: (typeof rows)[number]) => playing.has(s.osuId) && (!!s.permRole || s.displayRoles.some((r) => !CAN_PLAY.includes(r)));
  if (!can(viewer?.role, "staff")) notFound();
  return (
    <>
      <PageTitle>{t.admin.menu.staff}</PageTitle>
      <p className="-mt-4 mb-8 max-w-2xl text-sm text-ash">
        <Words text={t.admin.staffHelp} d={0.15} s={0.012} />
      </p>

      <Panel title={t.admin.addStaff} className="mb-6">
        <ActionForm action={addStaff} submit={t.admin.add} className="flex flex-wrap items-center gap-3">
          <input name="q" required maxLength={32} placeholder={t.admin.addPlaceholder} className={`${inputCls} w-full sm:w-64`} aria-label={t.admin.addPlaceholder} />
        </ActionForm>
      </Panel>

      <StaffList
        key={rows.map((s) => `${s.osuId}:${s.permRole}:${s.displayRoles.join("+")}`).join()}
        rows={rows.map((s) => ({
          osuId: s.osuId,
          username: s.username,
          avatarUrl: s.avatarUrl,
          country: s.country,
          permRole: s.permRole,
          displayRoles: s.displayRoles,
          builtIn: ADMINS.includes(s.osuId),
          clash: clash(s),
        }))}
      />
    </>
  );
}
