import { notFound, redirect } from "next/navigation";
import { getViewer } from "@/lib/authz";
import { can } from "@/lib/roles";
import { MENU } from "./menu";

export default async function Admin() {
  const roles = (await getViewer())?.roles;
  const first = MENU.find((m) => m.perm.some((x) => can(roles, x)));
  if (!first) notFound();
  redirect(first.href);
}
