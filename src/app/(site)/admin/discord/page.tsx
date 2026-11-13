import { forbidden } from "next/navigation";
import { PageTitle } from "@/components/site/page-title";
import { ActionForm, ErrorNote, Panel } from "@/components/admin/form";
import { labelCls } from "@/components/admin/label";
import { Dropdown } from "@/components/admin/dropdown";
import { CFG_KEYS, CFG_VOICE, getCfg, syncPreview } from "@/db/discord-bot";
import { cn, cssVars } from "@/lib/utils";
import { db } from "@/db";
import { discordTeams } from "@/db/schema";
import { getViewer } from "@/lib/authz";
import { getDict } from "@/lib/i18n/server";
import { can } from "@/lib/roles";
import { discordFailure, discordGuild, discordReady, guildChannels } from "@/lib/discord";
import { fill } from "@/lib/dates";
import { syncChannels } from "@/actions/discord";
import { ServerChip } from "./server-chip";

const minutesSince = (at: number) => Math.floor((Date.now() - at) / 60_000);

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
  const [cfg, chans, teams, plan, server] = await Promise.all([getCfg(), guildChannels().catch(() => null), db.select().from(discordTeams), syncPreview().catch(() => null), discordGuild()]);
  const bad = discordFailure();
  const mins = bad ? minutesSince(bad.at) : 0;
  const ago = mins < 1 ? d.agoNow : mins < 60 ? fill(d.agoMin, { n: String(mins) }) : fill(d.agoHour, { n: String(Math.floor(mins / 60)) });
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
  const lead = CFG_KEYS.length + (stats?.length ?? 0);

  return (
    <>
      <PageTitle mark="discord">{t.admin.menu.discord}</PageTitle>
      <Panel title={d.channels} i={0} className="mx-auto max-w-3xl">
        {bad && (
          <div className="mb-4 border-l-2 border-rose bg-rose/10 px-3 py-2">
            <ErrorNote>{fill(d.down, { why: `${d.why[bad.why]}${bad.status ? ` (${bad.status})` : ""}`, ago })}</ErrorNote>
          </div>
        )}
        {chans ? (
          <div
            className="[&>form]:flex [&>form]:flex-wrap [&>form]:items-center [&>form]:justify-center [&>form]:gap-x-3 [&>form]:gap-y-3"
            style={cssVars({ "--s": "0.06s", "--d": "0.5s", "--i": lead })}
          >
          <ActionForm action={syncChannels} submit={d.sync}>
            {server && <ServerChip name={server.name} icon={server.icon} label={d.server} i={lead + 1} />}
            <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2">
              {CFG_KEYS.map((k, i) => (
                <label key={k} className={cn("in-up", labelCls)} style={cssVars({ "--i": i })}>
                  {d.pick[k]}
                  <Dropdown name={k} defaultValue={cfg[k]} placeholder={d.none} aria-label={d.pick[k]} className="w-full" options={CFG_VOICE.includes(k) ? voice : text} />
                </label>
              ))}
            </div>
            {stats && (
              <dl className="mt-3 mb-2 grid w-full grid-cols-2 gap-x-6 gap-y-3 border-b border-line pb-4 sm:grid-cols-4">
                {stats.map(([label, n], j) => (
                  <div key={String(label)} className="in-up" style={cssVars({ "--i": CFG_KEYS.length + j })}>
                    <dt className="text-xs font-display font-bold text-ash">{label}</dt>
                    <dd className="num mt-0.5 text-2xl text-paper">{n}</dd>
                  </div>
                ))}
              </dl>
            )}
          </ActionForm>
          </div>
        ) : (
          <p className="text-sm text-rose-hi">{d.failed}</p>
        )}
      </Panel>
    </>
  );
}
