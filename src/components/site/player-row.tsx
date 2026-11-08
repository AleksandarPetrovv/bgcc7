"use client";

import { Crown } from "lucide-react";
import { flagUrl } from "@/lib/data";
import { cn } from "@/lib/utils";
import { useDict } from "./lang";
import { meP } from "./me";
import { Pfp, Pic } from "./pfp";

/** roster row: avatar, flag, `children` (name and tags), captain crown, `end`. `id` marks it for the viewer highlight, `hl` paints that highlight. */
export function PlayerRow({
  id,
  as: Tag = "li",
  avatar,
  pfpClass,
  lazy,
  country,
  captain,
  hl,
  end,
  className,
  style,
  children,
}: {
  id?: number | string | null;
  as?: "li" | "span";
  avatar: string;
  pfpClass?: string;
  lazy?: boolean;
  country?: string;
  captain?: boolean;
  hl?: boolean;
  end?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}) {
  const t = useDict();
  return (
    <Tag {...meP(id)} className={cn("flex items-center", hl && "me-hl", className)} style={style}>
      <Pfp src={avatar} lazy={lazy} className={pfpClass} />
      {country && <Pic src={flagUrl(country)} className="h-2.5 shrink-0" />}
      {children}
      {captain && <Crown className="size-3.5 shrink-0 -translate-y-px text-gold-hi" aria-label={t.common.captain} />}
      {end}
    </Tag>
  );
}
