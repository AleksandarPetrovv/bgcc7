"use client";

import { useRef } from "react";
import { CalendarDays } from "lucide-react";
import { useLang } from "./lang";
import { inputWeekday } from "@/lib/time";
import { cn } from "@/lib/utils";

type Props = Omit<React.InputHTMLAttributes<HTMLInputElement>, "type" | "value" | "onChange"> & {
  value: string;
  onValue: (v: string) => void;
  /** skewed background layer (border, fill, focus via group-focus-within) */
  box: string;
  /** text style of the shown value */
  text: string;
};

/** datetime-local that reads "01/10/2027, 18:00, Friday".
 *  chrome won't size a date input to its text, so the text is drawn here and the real input sits invisible on top (click opens the picker).
 *  only the background layer is skewed, text and icon stay crisp */
export function WeekdayInput({ value, onValue, box, text, className, ...props }: Props) {
  const ref = useRef<HTMLInputElement>(null);
  const day = inputWeekday(value, useLang() === "bg" ? "bg-BG" : "en-GB");
  const m = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}:\d{2})/);
  return (
    <label className={cn("group relative isolate flex min-w-0 items-center pl-4 pr-3", className)}>
      <span aria-hidden className={cn("absolute inset-0 -z-10 -skew-x-12", box)} />
      <span aria-hidden className={cn("pointer-events-none min-w-0 select-none truncate whitespace-pre", text)}>
        {m ? `${m[3]}/${m[2]}/${m[1]}, ${m[4]}, ${day}` : "—"}
      </span>
      <CalendarDays aria-hidden className="pointer-events-none ml-auto size-4 shrink-0 text-ash group-hover:text-paper" />
      <input
        {...props}
        ref={ref}
        type="datetime-local"
        value={value}
        onChange={(e) => onValue(e.target.value)}
        onClick={() => ref.current?.showPicker?.()}
        className="adm-bare absolute inset-0 size-full cursor-pointer opacity-0 [color-scheme:light]"
      />
    </label>
  );
}
