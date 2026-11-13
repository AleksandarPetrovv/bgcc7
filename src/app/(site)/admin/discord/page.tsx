import { forbidden } from "next/navigation";
import { PageTitle } from "@/components/site/page-title";
import { ActionForm, Panel } from "@/components/admin/form";
import { labelCls } from "@/components/admin/label";
import { Dropdown } from "@/components/admin/dropdown";
import { CFG_KEYS, CFG_VOICE, getCfg, syncPreview } from "@/db/discord-bot";
import { db } from "@/db";
import { discordTeams } from "@/db/schema";
import { getViewer } from "@/lib/authz";
import { getDict } from "@/lib/i18n/server";
import { can } from "@/lib/roles";
import { discordReady, guildChannels } from "@/lib/discord";
import { syncChannels } from "@/actions/discord";

export default async function AdminDiscord() {
  const [t, viewer] = await Promise.all([getDict(), getViewer()]);
  if (!can(viewer?.roles, "discord")) forbidden();
  const d = t.admin.dc;
  if (!discordReady()) {
    return (
      <>
        <PageTitle mark="discord">{t.admin.menu.discord}</PageTitle>
        <p className="text-ash">{d.off}</p>
      </>
    );
  }
  const [cfg, chans, teams, plan] = await Promise.all([getCfg(), guildChannels().catch(() => null), db.select().from(discordTeams), syncPreview().catch(() => null)]);
  // team sections are the bot's own, so they're never offered here
  const mine = new Set(teams.flatMap((r) => [r.channelId, r.voiceId]));
  const cats = new Map((chans ?? []).filter((c) => c.type === 4).map((c) => [c.id, c]));
  // discord's order: uncategorized first, then by category position, then channel position
  const catPos = (c: { parent_id: string | null }) => cats.get(c.parent_id ?? "")?.position ?? -1;
  const options = (voice: boolean) =>
    (chans ?? [])
      .filter((c) => (voice ? c.type === 2 : c.type === 0 || c.type === 5) && !mine.has(c.id))
      .sort((a, b) => catPos(a) - catPos(b) || a.position - b.position)
      .map((c) => ({ value: c.id, label: voice ? c.name : `#${c.name}`, hint: cats.get(c.parent_id ?? "")?.name ?? "" }));
  const text = options(false);
  const voice = options(true);
  const stats = plan && [
    [d.fullTeams, plan.teams],
    [d.categories, plan.drawn ? plan.categories : d.afterDraw],
    [d.teamRoles, plan.teamRoles],
    [d.staffRoles, plan.staffRoles],
  ];

  return (
    <>
      <PageTitle mark="discord">{t.admin.menu.discord}</PageTitle>
      <Panel title={d.channels} i={0} className="mx-auto max-w-3xl">
        {chans ? (
          <ActionForm action={syncChannels} submit={d.sync}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {CFG_KEYS.map((k) => (
                <label key={k} className={labelCls}>
                  {d.pick[k]}
                  <Dropdown name={k} defaultValue={cfg[k]} placeholder={d.none} aria-label={d.pick[k]} className="w-full" options={CFG_VOICE.includes(k) ? voice : text} />
                </label>
              ))}
            </div>
            {stats && (
              <dl className="mt-6 mb-5 grid grid-cols-2 gap-x-6 gap-y-3 border-y border-line py-4 sm:grid-cols-4">
                {stats.map(([label, n]) => (
                  <div key={String(label)}>
                    <dt className="text-xs font-display font-bold text-ash">{label}</dt>
                    <dd className="num mt-0.5 text-2xl text-paper">{n}</dd>
                  </div>
                ))}
              </dl>
            )}
          </ActionForm>
        ) : (
          <p className="text-sm text-rose-hi">{d.failed}</p>
        )}
      </Panel>
    </>
  );
}
