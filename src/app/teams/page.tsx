import { Search, SlidersHorizontal } from "lucide-react";
import { Container, PageTitle } from "@/components/site/page";
import { TeamCard } from "@/components/site/team-card";
import { teams } from "@/lib/data";

export default function Teams() {
  return (
    <Container>
      <PageTitle
        right={
          <>
            <button className="flex items-center gap-2 text-[0.65rem] font-black uppercase text-paper">
              Filters <SlidersHorizontal className="size-5 text-rose" />
            </button>
            <div className="flex items-center gap-2 border border-line px-3">
              <Search className="size-4 text-ash" />
              <input placeholder="Search for a player or team" className="h-10 w-56 bg-transparent text-sm outline-none placeholder:text-ash" />
            </div>
          </>
        }
      >
        Team list
      </PageTitle>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {teams.map((t) => (
          <TeamCard key={t.id} team={t} />
        ))}
      </div>
    </Container>
  );
}
