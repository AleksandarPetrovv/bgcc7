import { notFound } from "next/navigation";
import { getLog } from "@/db/admin";
import { getViewer } from "@/lib/authz";
import { getDict, getLang } from "@/lib/i18n/server";
import { can } from "@/lib/roles";
import { LogTable } from "./log-table";

export default async function AdminLog() {
  const [t, lang, viewer, rows] = await Promise.all([getDict(), getLang(), getViewer(), getLog()]);
  if (!can(viewer?.role, "log")) notFound();
  return (
    <>
      <h1 className="heading-slam mb-6 text-4xl sm:text-5xl">{t.admin.menu.log}</h1>
      <LogTable rows={rows} lang={lang} empty={t.admin.noLog} head={[t.admin.when, t.admin.who, t.admin.what]} />
    </>
  );
}
