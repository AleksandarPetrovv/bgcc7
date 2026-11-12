import { Fragment } from "react";
import { pageMeta } from "@/lib/page-meta";
import { Container, SectionHeading } from "@/components/site/page";
import { PageTitle } from "@/components/site/page-title";
import { SlantButton } from "@/components/site/slant";
import { getDict } from "@/lib/i18n/server";
import { DISCORD_URL, osuUser } from "@/lib/links";
import { flagUrl } from "@/lib/data";
import { getPublicStaff } from "@/db/admin";
import { ROLES, type Role } from "@/lib/roles";
import { cn } from "@/lib/utils";
import { requireSection } from "@/lib/authz";
import { Stagger, StaggerItem } from "@/components/site/motion";
import { avatarPath } from "@/lib/avatar";
import { RuleDiamond } from "@/components/site/rule";

const rank = (r: string) => ROLES.indexOf(r as (typeof ROLES)[number]) + 1 || 99;
// categories top to bottom; a person sits in the first one they hold and keeps all their role chips
const MAIN: Role[] = ["host", "referee", "mappooler", "streamer", "playtester"];
const ORDER: Role[] = [...MAIN, ...ROLES.filter((r) => !MAIN.includes(r))];

export const generateMetadata = pageMeta("staff");

export default async function Staff() {
  await requireSection("staff");
  const [t, rows] = await Promise.all([getDict(), getPublicStaff()]);
  // same rule as the info page: the first host is the Host, the rest are Co-hosts
  const hostAt = new Map(rows.filter((p) => p.permRoles.includes("host")).map((p, i) => [p.osuId, Math.min(i, 1)]));
  const list = rows.map((p) => ({
    osuId: p.osuId,
    username: p.username,
    avatar: p.avatarUrl ? avatarPath(p.osuId, true) : "",
    country: p.country ?? "",
    discord: p.discordName,
    roles: [...p.permRoles].sort((a, b) => rank(a) - rank(b)),
  }));
  const groups = ORDER.map((role) => ({ role, people: list.filter((p) => ORDER.find((r) => p.roles.includes(r)) === role) })).filter((g) => g.people.length);
  const shown = groups.flatMap((g) => g.people);
  const open = ROLES.filter((r) => !list.some((p) => p.roles.includes(r)));

  return (
    <Container>
      <PageTitle mark="badge">
        {t.staff.title}
      </PageTitle>

      {groups.map((g) => (
      <Fragment key={g.role}>
      <SectionHeading>{t.staff.groups[g.role]}</SectionHeading>
      <Stagger className="grid grid-cols-1 gap-x-8 gap-y-6 sm:grid-cols-2 xl:grid-cols-3 2xl:gap-x-10 2xl:gap-y-8">
        {g.people.map((p) => {
          const i = shown.indexOf(p);
          return (
          <StaggerItem as="article" key={p.username} className="group relative flex border-b-2 border-dashed border-line transition-colors hover:border-paper/30">
            <RuleDiamond />
            <div className="flex shrink-0 items-center justify-center py-3 pr-1 sm:py-5 sm:pr-2" style={{ "--i": i, "--s": "0.08s", "--d": "0.2s" } as React.CSSProperties}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={p.avatar}
                alt=""
                className="in-spin size-14 rounded-full object-cover sm:size-24"
              />
            </div>
            <div className="flex min-w-0 flex-1 flex-col justify-between gap-2.5 p-3 sm:gap-3 sm:p-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2.5">
                  <h2 className="heading-slam truncate text-xl sm:text-2xl">
                    <a href={osuUser(p.osuId)} target="_blank" rel="noreferrer" className="hover:text-rose-hi">
                      {p.username}
                    </a>
                  </h2>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {p.country && <img src={flagUrl(p.country)} alt={p.country} className="h-3 w-auto shrink-0" />}
                </div>
                {p.discord && <p className="mt-0.5 truncate text-xs text-ash">{p.discord}</p>}
              </div>
              <ul className="flex flex-wrap gap-1.5">
                {p.roles.map((r, j) => (
                  <li
                    key={r}
                    style={{ "--i": i + j, "--s": "0.08s", "--d": "0.45s" } as React.CSSProperties}
                    className={cn(
                      "in-pop px-2 py-1 text-[0.65rem] font-display font-bold leading-none",
                      j === 0 ? "bg-rose text-white" : "border border-line text-paper/85",
                    )}
                  >
                    {r === "host" ? t.info.hostRoles[hostAt.get(p.osuId) ?? 0] : (t.admin.roles[r] ?? r)}
                  </li>
                ))}
              </ul>
            </div>
          </StaggerItem>
          );
        })}
      </Stagger>
      </Fragment>
      ))}

      {open.length > 0 && (
        <>
          <SectionHeading>{t.staff.openRoles}</SectionHeading>
          <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
            <div className="flex-1">
              <ul className="flex flex-wrap gap-1.5">
                {open.map((r) => (
                  <li key={r} className="border border-balkan/60 px-2 py-1 text-[0.65rem] font-display font-bold leading-none text-balkan-hi">
                    {t.admin.roles[r] ?? r}
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-sm text-ash">{t.staff.openText}</p>
            </div>
            <SlantButton tone="balkan" href={DISCORD_URL}>
              {t.common.discord}
            </SlantButton>
          </div>
        </>
      )}
    </Container>
  );
}
