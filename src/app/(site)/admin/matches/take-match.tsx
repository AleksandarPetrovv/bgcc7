"use client";

import { useState, useTransition } from "react";
import { Btn, ErrorNote, useConfirm } from "@/components/admin/form";
import { useDict } from "@/components/site/lang";
import { takeMatch } from "./actions";

export function TakeMatch({ id, label, from, kind, lobby }: { id: string; label: string; from: string; kind: "take" | "over"; lobby: boolean }) {
  const t = useDict();
  const [pending, start] = useTransition();
  const [fail, setFail] = useState(false);
  const [ask, dialog] = useConfirm();
  const name = kind === "take" ? t.admin.take.take : t.admin.take.over;
  const run = () =>
    start(async () => {
      setFail(false);
      const r = await takeMatch(id).catch(() => null);
      if (!r?.ok) setFail(true);
    });
  return (
    <div className="in-up mb-5 flex flex-wrap items-center gap-3">
      <Btn
        type="button"
        disabled={pending}
        onClick={() =>
          ask({
            text: `${t.admin.take.becomes(label)}${from ? ` ${t.admin.take.removed(from)}` : ""}`,
            yes: name,
            body: lobby ? <p className="mt-3 text-sm text-paper/75">{t.admin.take.lobby}</p> : undefined,
            onYes: run,
          })
        }
      >
        {name}
      </Btn>
      {fail && !pending && <ErrorNote />}
      {dialog}
    </div>
  );
}
