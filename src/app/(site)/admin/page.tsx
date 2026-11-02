import { notFound, redirect } from "next/navigation";
import { getViewer } from "@/lib/authz";
import { adminMenu } from "./menu";

export default async function Admin() {
  const [first] = adminMenu((await getViewer())?.roles);
  if (!first) notFound();
  redirect(first.href);
}
