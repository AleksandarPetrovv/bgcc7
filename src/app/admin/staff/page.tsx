import { notFound } from "next/navigation";
import { InView } from "@/components/site/in-view";
import { Words } from "@/components/site/rich";
import { PageTitle } from "@/components/site/page";
import { ActionForm, inputCls, Panel } from "@/components/admin/form";
import { getStaff } from "@/db/admin";
import { getViewer } from "@/lib/authz";
import { ADMINS } from "@/lib/admins";
import { getDict } from "@/lib/i18n/server";
import { can, ROLES, STAFF_ROLES } from "@/lib/roles";
import { flagUrl } from "@/lib/data";
import { addStaff, removeStaff, updateStaff } from "./actions";

export default async function AdminStaff() {
  const [t, viewer, rows] = await Promise.all([getDict(), getViewer(), getStaff()]);
  if (!can(viewer?.role, "staff")) notFound();
  return (
    <>
      <PageTitle>{t.admin.menu.staff}</PageTitle>
      <p className="-mt-4 mb-8 max-w-2xl text-sm text-ash">
        <Words text={t.admin.staffHelp} d={0.15} s={0.012} />
      </p>

      <Panel title={t.admin.addStaff} className="mb-6">
        <ActionForm action={addStaff} submit={t.admin.add} className="flex flex-wrap items-center gap-3">
          <input name="q" required maxLength={32} placeholder={t.admin.addPlaceholder} className={`${inputCls} w-64`} aria-label={t.admin.addPlaceholder} />
        </ActionForm>
      </Panel>

      <div className="space-y-3">
        {rows.map((s, n) => {
          const builtIn = ADMINS.includes(s.osuId);
          return (
            <InView self key={s.osuId} className="in-up border border-line bg-coal" style={{ "--i": n < 6 ? n : 0, "--s": "0.09s", "--d": "0.35s" } as React.CSSProperties}>
              <div className="flex items-center gap-3 border-b border-line px-4 py-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {s.avatarUrl && <img src={s.avatarUrl} alt="" className="in-spin size-9 [--d:0.5s]" />}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {s.country && <img src={flagUrl(s.country)} alt="" className="h-2.5" />}
                <span className="in-wipe font-black [--d:0.6s]">{s.username}</span>
                <span className="num text-xs text-ash">#{s.osuId}</span>
                {builtIn && <span className="in-slam ml-auto text-xs font-black uppercase text-balkan [--d:0.75s]">{t.admin.builtIn}</span>}
              </div>
              <div className="flex flex-col gap-4 p-4 lg:flex-row lg:items-end">
                <ActionForm action={updateStaff.bind(null, s.osuId)} className="flex flex-1 flex-col gap-4">
                  <div className="flex flex-wrap gap-4">
                    <label className="flex flex-col gap-1 text-xs font-bold uppercase text-ash">
                      {t.admin.permission}
                      <select name="permRole" defaultValue={builtIn ? "host" : (s.permRole ?? "")} disabled={builtIn} className={inputCls}>
                        <option value="">{t.admin.noPerm}</option>
                        {ROLES.map((r) => (
                          <option key={r} value={r}>
                            {t.admin.roles[r]}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="flex flex-col gap-1 text-xs font-bold uppercase text-ash">
                      {t.admin.order}
                      <input type="number" name="order" min={0} max={999} defaultValue={s.order} className={`${inputCls} w-24`} />
                    </label>
                  </div>
                  <fieldset>
                    <legend className="mb-1.5 text-xs font-bold uppercase text-ash">{t.admin.publicRoles}</legend>
                    <div className="flex flex-wrap gap-1.5">
                      {STAFF_ROLES.map((r, k) => (
                        <label
                          key={r}
                          style={{ "--i": k, "--s": "0.04s", "--d": "0.7s" } as React.CSSProperties}
                          className="in-pop cursor-pointer border border-line px-2 py-1.5 text-xs font-black uppercase text-ash transition-colors has-[:checked]:border-rose has-[:checked]:bg-rose has-[:checked]:text-white"
                        >
                          <input type="checkbox" name="displayRoles" value={r} defaultChecked={s.displayRoles.includes(r)} className="sr-only" />
                          {t.staff.roles[r] ?? r}
                        </label>
                      ))}
                    </div>
                  </fieldset>
                </ActionForm>
                {!builtIn && (
                  <ActionForm action={removeStaff.bind(null, s.osuId)} submit={t.admin.remove} ghost confirm={t.admin.confirmRemove} />
                )}
              </div>
            </InView>
          );
        })}
      </div>
    </>
  );
}
