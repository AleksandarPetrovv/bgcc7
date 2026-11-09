import { getViewer } from "@/lib/authz";
import { can } from "@/lib/roles";
import { PoolMode } from "./pool-mode";

/** the title and Edit / Sheet switch live here so moving between them, rounds and mods never replays their intro */
export default async function MappoolsLayout({ children }: { children: React.ReactNode }) {
  const viewer = await getViewer();
  return (
    <>
      <PoolMode edit={can(viewer?.roles, "host")} />
      {children}
    </>
  );
}
