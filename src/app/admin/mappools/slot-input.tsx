"use client";

import { ActionForm, Field, inputCls } from "@/components/admin/form";
import { useDict } from "@/components/site/lang";
import type { ActionResult } from "@/lib/roles";
import { cn } from "@/lib/utils";

type Action = (prev: ActionResult, fd: FormData) => Promise<ActionResult>;

export function SlotInput({ action, submit, className }: { action: Action; submit?: string; className?: string }) {
  const t = useDict();
  return (
    <ActionForm action={action} submit={submit ?? t.admin.add} className={cn("flex min-w-0 flex-1 flex-wrap items-center gap-2.5", className)}>
      <Field name="beatmap" required placeholder={t.admin.pasteMap} aria-label={t.admin.beatmap} className={cn(inputCls, "min-w-48 flex-1")} />
    </ActionForm>
  );
}
