import { notFound } from "next/navigation";
import { PageTitle } from "@/components/site/page-title";
import { ActionForm, Panel } from "@/components/admin/form";
import { labelCls } from "@/components/admin/label";
import { Dropdown } from "@/components/admin/dropdown";
import { getCfg } from "@/db/discord-bot";
import { db } from "@/db";
import { discordTeams } from "@/db/schema";
import { getViewer } from "@/lib/authz";
import { getDict } from "@/lib/i18n/server";
import { can } from "@/lib/roles";
import { discordReady, guildChannels } from "@/lib/discord";
import { saveChannels, syncNow } from "@/actions/discord";

export default async function AdminDiscord() {
  const [t, viewer] = await Promise.all([getDict(), getViewer()]);
  if (!can(viewer?.roles, "discord")) notFound();
  const d = t.admin.dc;
  if (!discordReady()) {
    return (
      <>
        <PageTitle mark="discord">{t.admin.menu.discord}</PageTitle>
        <p className="text-ash">{d.off}</p>
      </>
    );
  }
  const [cfg, chans, teams] = await Promise.all([getCfg(), guildChannels().catch(() => null), db.select().from(discordTeams)]);
  // the server's own text channels only, not the bot's team channels or their category
  const mine = new Set(teams.map((r) => r.channelId));
  const cats = new Map((chans ?? []).filter((c) => c.type === 4).map((c) => [c.id, c]));
  // discord's order: uncategorized first, then by category position, then channel position
  const catPos = (c: { parent_id: string | null }) => cats.get(c.parent_id ?? "")?.position ?? -1;
  const options = (chans ?? [])
    .filter((c) => (c.type === 0 || c.type === 5) && !mine.has(c.id))
    .sort((a, b) => catPos(a) - catPos(b) || a.position - b.position)
    .map((c) => ({ value: c.id, label: `#${c.name}`, hint: cats.get(c.parent_id ?? "")?.name ?? "" }));

  return (
    <>
      <PageTitle mark="discord">{t.admin.menu.discord}</PageTitle>
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2 xl:items-start">
        <Panel title={d.channels} help={d.channelsHelp} i={0}>
          {chans ? (
            <ActionForm action={saveChannels} submit={t.admin.save} className="space-y-4">
              <label className={labelCls}>
                {d.results}
                <Dropdown name="results" defaultValue={cfg.results} placeholder={d.none} aria-label={d.results} className="w-full" options={options} />
              </label>
              <label className={labelCls}>
                {d.pool}
                <Dropdown name="pool" defaultValue={cfg.pool} placeholder={d.none} aria-label={d.pool} className="w-full" options={options} />
              </label>
            </ActionForm>
          ) : (
            <p className="text-sm text-rose-hi">{d.failed}</p>
          )}
        </Panel>
        <Panel title={d.teams} help={d.teamsHelp} i={1}>
          <p className="mb-4 text-sm text-ash">{d.teamCount(teams.length)}</p>
          <ActionForm action={syncNow} submit={d.sync} />
        </Panel>
      </div>
    </>
  );
}
