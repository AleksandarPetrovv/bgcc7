import { Container, PageTitle, SubHeading } from "@/components/site/page";
import { staff, flagUrl, type StaffMember } from "@/lib/data";

const ROLE_ORDER = ["Host", "Mappooler", "Playtester", "Referee", "Streamer", "Commentator", "GFX / Designer", "Developer"];

function Card({ s }: { s: StaffMember }) {
  return (
    <div className="flex h-16 w-full items-center gap-3 border border-line bg-coal pr-3 transition hover:border-balkan sm:w-56">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={s.avatar} alt="" className="size-16 object-cover" />
      <div className="flex min-w-0 flex-col justify-center">
        <span className="truncate font-black">{s.username}</span>
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
              <SubHeading>{role}</SubHeading>
              {inRole.length ? (
                <div className="flex flex-wrap gap-3">
                  {inRole.map((s) => (
                    <Card key={s.username} s={s} />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-ash">Nobody here yet. If you want this role, ask in the Discord.</p>
              )}
            </section>
          );
        })}
      </div>
    </Container>
  );
}
