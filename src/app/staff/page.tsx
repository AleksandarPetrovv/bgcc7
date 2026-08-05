import { Container, PageTitle, SectionHeading, SlantButton } from "@/components/site/page";
import { getDict } from "@/lib/i18n/server";
import { DISCORD_URL, osuUser } from "@/lib/links";
import { staff, flagUrl, type StaffMember } from "@/lib/data";
import { cn } from "@/lib/utils";

const ROLE_ORDER = ["Host", "Mappooler", "Playtester", "Referee", "Streamer", "Commentator", "GFX / Designer", "Developer"];
const rank = (r: string) => (ROLE_ORDER.indexOf(r) + 1 || 99);

export default async function Staff() {
  const t = await getDict();
  const people = new Map<string, StaffMember>();
  for (const p of [...staff.organizational, ...staff.assistive]) {
    const prev = people.get(p.username);
    people.set(p.username, prev ? { ...prev, roles: [...new Set([...prev.roles, ...p.roles])] } : p);
  }
  const list = [...people.values()]
    .map((p) => ({ ...p, roles: [...p.roles].sort((a, b) => rank(a) - rank(b)) }))
    .sort((a, b) => rank(a.roles[0]) - rank(b.roles[0]) || b.roles.length - a.roles.length);
  const open = ROLE_ORDER.filter((r) => !list.some((p) => p.roles.includes(r)));

  return (
    <Container className="max-w-5xl">
      <PageTitle right={<span className="num text-2xl text-balkan">{list.length}</span>}>{t.staff.title}</PageTitle>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {list.map((p) => (
          <article key={p.username} className="group flex border border-line bg-coal transition-colors hover:border-paper/30">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.avatar} alt="" className="size-28 shrink-0 object-cover sm:size-32" />
            <div className="flex min-w-0 flex-1 flex-col justify-between gap-3 p-4">
              <div className="flex items-center gap-2.5">
                <h2 className="heading-slam truncate text-2xl">
                  <a href={osuUser(p.username)} target="_blank" rel="noreferrer" className="hover:text-rose-hi">{p.username}</a>
                </h2>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={flagUrl(p.country)} alt={p.country} className="h-3 w-auto shrink-0" />
              </div>
              <ul className="flex flex-wrap gap-1.5">
                {p.roles.map((r, i) => (
                  <li
                    key={r}
                    className={cn(
                      "px-2 py-1 text-[0.65rem] font-black uppercase leading-none tracking-wide",
                      i === 0 ? "bg-rose text-white" : "border border-line text-paper/85",
                    )}
                  >
                    {t.staff.roles[r] ?? r}
                  </li>
                ))}
              </ul>
            </div>
          </article>
        ))}
      </div>

      {open.length > 0 && (
        <>
          <SectionHeading>{t.staff.openRoles}</SectionHeading>
          <div className="flex flex-col gap-4 border border-dashed border-line p-5 sm:flex-row sm:items-center">
            <div className="flex-1">
              <ul className="flex flex-wrap gap-1.5">
                {open.map((r) => (
                  <li key={r} className="border border-balkan/60 px-2 py-1 text-[0.65rem] font-black uppercase leading-none tracking-wide text-balkan">
                    {t.staff.roles[r] ?? r}
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-sm text-ash">{t.staff.openText}</p>
            </div>
            <SlantButton tone="balkan" href={DISCORD_URL}>{t.common.discord}</SlantButton>
          </div>
        </>
      )}
    </Container>
  );
}
