import { Search, SlidersHorizontal } from "lucide-react";
import { Container, PageTitle } from "@/components/site/page";
import { TeamCard } from "@/components/site/team-card";
import { getDict } from "@/lib/i18n/server";
import { teams } from "@/lib/data";

export default async function Teams() {
  const t = await getDict();
  return (
    <Container>
      <PageTitle
        right={
          <>
            <button type="button" className="flex items-center gap-2 text-[0.7rem] font-black uppercase text-paper">
              {t.common.filters} <SlidersHorizontal className="size-5 text-rose-hi" />
            </button>
            <label className="flex items-center gap-2 border border-line px-3">
              <Search className="size-4 text-ash" />
              <input type="search" aria-label={t.common.searchLabel} placeholder={t.common.search} className="h-10 w-56 bg-transparent text-sm outline-none placeholder:text-ash" />
            </label>
          </>
        }
      >
        {t.teams.title}
      </PageTitle>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {teams.map((team) => (
          <TeamCard key={team.id} team={team} />
        ))}
      </div>
    </Container>
  );
}
