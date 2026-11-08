"use client";

import { cn } from "@/lib/utils";
import { usePollRefresh } from "@/components/site/use-poll-refresh";
import { Download, Link2, Unlink } from "lucide-react";
import { SlantButton } from "@/components/site/slant";
import { helperState, linkHelper, unlinkHelper } from "@/actions/helper-link";
import { ActionForm, Field, Panel } from "./form";
import { labelCls } from "./label";
import { useDict } from "@/components/site/lang";

function LinkGate({ linked, children }: { linked: boolean; children: React.ReactNode }) {
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

export function HelperPoll({ sig }: { sig: string }) {
  usePollRefresh(sig, helperState, 3000);
  return null;
}

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

function UnlinkHelper() {
  const r = useDict().admin.refApp;
  return <ActionForm action={unlinkHelper} submit={r.unlink} ghost confirm={r.unlinkAsk} icon={<Unlink className="size-3.5" />} />;
}

export function HelperStatus({ linked, online, state }: { linked: boolean; online: boolean; state?: boolean }) {
  const r = useDict().admin.refApp;
  const actions = (
    <>
      <SlantButton href="/download/helper" download tone="rose">
        <Download className="size-4" /> {r.download}
      </SlantButton>
      {linked && <UnlinkHelper />}
    </>
  );
  if (!state) return actions;
  return (
    <div className="flex flex-wrap items-center gap-4">
      <span className="flex items-center gap-2.5 text-sm font-display font-bold">
        <span className={cn("size-2.5 rotate-45", online ? "bg-balkan" : linked ? "bg-gold" : "bg-line")} aria-hidden />
        <span className={online ? "text-paper" : "text-ash"}>{online ? r.online : linked ? r.offline : r.none}</span>
      </span>
      <span className="ml-auto flex flex-wrap items-center gap-3">{actions}</span>
    </div>
  );
}
