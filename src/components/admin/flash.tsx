"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export function Flash({ className, children }: { className?: string; children: React.ReactNode }) {
  const [phase, setPhase] = useState<"on" | "fading" | "gone">("on");
  useEffect(() => {
    const a = setTimeout(() => setPhase("fading"), 3000);
    const b = setTimeout(() => setPhase("gone"), 3500);
    return () => {
      clearTimeout(a);
      clearTimeout(b);
    };
  }, []);
  if (phase === "gone") return null;
  return (
    <span role="status" className={cn("transition-opacity duration-500", phase === "fading" && "opacity-0", className)}>
      {children}
    </span>
  );
}
