import { forbidden, redirect } from "next/navigation";
import { menuHidden } from "@/db/pool-settle";
import { getViewer } from "@/lib/authz";
import { adminMenu } from "./menu";

export default async function Admin() {
  const viewer = await getViewer();
  const [first] = adminMenu(viewer?.roles, viewer ? await menuHidden(viewer) : []);
  if (!first) forbidden();
  redirect(first.href);
}
