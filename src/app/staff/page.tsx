import { Container, PageTitle } from "@/components/site/page";
import { staff, flagUrl, type StaffMember } from "@/lib/data";

const ROLE_ORDER = ["Host", "Mappooler", "Playtester", "Referee", "Streamer", "Commentator", "GFX / Designer", "Developer"];

function Card({ s }: { s: StaffMember }) {
  return (
    <div className="flex h-[76px] w-56 bg-paper text-ink">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={s.avatar} alt="" className="size-[76px] object-cover" />
      <div className="w-2.5 bg-rose" />
      <div className="flex flex-col justify-center px-3">
        <span className="font-black">{s.username}</span>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={flagUrl(s.country)} alt="" className="mt-1 h-2.5 w-4" />
      </div>
    </div>
  );
}

export default function Staff() {
  const people = [...staff.organizational, ...staff.assistive];
  return (
    <Container className="max-w-5xl">
      <PageTitle>Staff</PageTitle>
      <div className="space-y-7">
        {ROLE_ORDER.map((role) => {
          const inRole = people.filter((p) => p.roles.includes(role));
          return (
            <section key={role}>
              <h2 className="mb-3 border-b border-rose pb-1 text-sm font-black uppercase tracking-wide text-rose">{role}</h2>
              {inRole.length ? (
                <div className="flex flex-wrap gap-5">
                  {inRole.map((s) => (
                    <Card key={s.username} s={s} />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-ash">Applications open in the Discord.</p>
              )}
            </section>
          );
        })}
      </div>
    </Container>
  );
}
