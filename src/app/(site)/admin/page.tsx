import { forbidden, redirect } from "next/navigation";
import { menuHidden } from "@/db/pool-settle";
import { getSettings } from "@/db/settings";
import { getViewer } from "@/lib/authz";
import { adminMenu } from "./menu";

export default async function Admin() {
  const [viewer, { phase }] = await Promise.all([getViewer(), getSettings()]);
  const [first] = adminMenu(viewer?.roles, phase, viewer ? await menuHidden(viewer) : []);
  if (!first) forbidden();
  redirect(first.href);
}
