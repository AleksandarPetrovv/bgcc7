import { forbidden, redirect } from "next/navigation";
import { menuHidden } from "@/db/pool-settle";
import { getViewer } from "@/lib/authz";
import { adminMenu } from "./menu";

export default async function Admin() {
  const roles = (await getViewer())?.roles;
  const [first] = adminMenu(roles, await menuHidden(roles));
  if (!first) forbidden();
  redirect(first.href);
}
