"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Dropdown, type DropOption } from "@/components/admin/dropdown";

export function StaffFilter({ options, value, label, all }: { options: DropOption[]; value: string; label: string; all: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <div className="mb-6 grid max-w-sm gap-2">
      <span className="text-xs font-black uppercase tracking-wide text-ash">{label}</span>
      <Dropdown
        options={[{ value: "", label: all }, ...options]}
        value={value}
        aria-label={label}
        disabled={pending}
        className="w-full"
        onChange={(next) => startTransition(() => router.push(next ? `/admin/log?user=${encodeURIComponent(next)}` : "/admin/log", { scroll: false }))}
      />
    </div>
  );
}
