"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Link2, Unlink } from "lucide-react";
import { helperState, linkHelper, unlinkHelper } from "@/actions/helper-link";
import { ActionForm, Field, Panel, labelCls } from "./form";
import { useDict } from "@/components/site/lang";

// link panel collapses once the helper is linked and comes back after an unlink
export function LinkGate({ linked, children }: { linked: boolean; children: React.ReactNode }) {
  return (
    <div
      inert={linked}
      className={cn(
        "grid transition-[grid-template-rows,opacity,margin] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]",
        linked ? "-mb-6 grid-rows-[0fr] opacity-0" : "grid-rows-[1fr] opacity-100",
      )}
    >
      <div className="-mx-3 min-h-0 overflow-hidden px-3">{children}</div>
    </div>
  );
}

// the helper reports to the server on its own; re-fetch the page data in place when its state changes
export function HelperPoll({ sig }: { sig: string }) {
  const router = useRouter();
  const last = useRef(sig);
  useEffect(() => {
    last.current = sig;
  }, [sig]);
  useEffect(() => {
    const id = setInterval(async () => {
      if (document.hidden) return;
      const s = await helperState().catch(() => null);
      if (s && s !== last.current) {
        last.current = s;
        router.refresh();
      }
    }, 3000);
    return () => clearInterval(id);
  }, [router]);
  return null;
}

/** the link-code panel, folded away while the helper is linked */
export function HelperLink({ linked, i }: { linked: boolean; i: number }) {
  const r = useDict().admin.refApp;
  return (
    <LinkGate linked={linked}>
      <Panel title={r.linkTitle} i={i}>
        <ActionForm action={linkHelper} submit={r.link} icon={<Link2 className="size-4" />} className="flex flex-wrap items-end gap-3">
          <label className={labelCls}>
            {r.linkCode}
            <Field name="code" required maxLength={64} autoComplete="off" spellCheck={false} className="w-64" />
          </label>
        </ActionForm>
      </Panel>
    </LinkGate>
  );
}

export function UnlinkHelper() {
  const r = useDict().admin.refApp;
  return <ActionForm action={unlinkHelper} submit={r.unlink} ghost confirm={r.unlinkAsk} icon={<Unlink className="size-3.5" />} />;
}
