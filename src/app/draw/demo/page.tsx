import type { Metadata } from "next";
import { getDict } from "@/lib/i18n/server";
import { DrawDemo } from "./demo";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getDict();
  return { title: `${t.wheel.title} · ${t.wheel.demo}` };
}

export default function DrawDemoPage() {
  return <DrawDemo />;
}
