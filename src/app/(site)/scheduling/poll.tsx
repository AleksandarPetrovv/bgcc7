"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { schedSig } from "./actions";

/** refreshes the page when the other team answers, proposes or edits availability */
export function SchedPoll({ sig }: { sig: string }) {
  const router = useRouter();
  const last = useRef(sig);
  useEffect(() => {
    last.current = sig;
  }, [sig]);
  useEffect(() => {
    const check = async () => {
      if (document.hidden) return;
      const s = await schedSig().catch(() => null);
      if (s && s !== last.current) {
        last.current = s;
        router.refresh();
      }
    };
    const id = setInterval(check, 5000);
    window.addEventListener("focus", check);
    return () => {
      clearInterval(id);
      window.removeEventListener("focus", check);
    };
  }, [router]);
  return null;
}
