import { notFound, redirect } from "next/navigation";
import { getPoolStages } from "@/db/mappools";
import { poolPack } from "@/lib/authz";

/** a pack link: straight to the file when it can be downloaded, otherwise the 404 page says why */
export default async function Download({ params, searchParams }: PageProps<"/download/[slug]">) {
  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  const stage = (await getPoolStages()).find((s) => s.slug === slug);
  if (!stage?.pack || !(await poolPack(stage.released))) notFound();
  redirect(`/download/${slug}/zip${typeof sp.v === "string" ? `?v=${encodeURIComponent(sp.v)}` : ""}`);
}
