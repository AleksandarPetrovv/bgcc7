import { Pfp } from "@/components/site/pfp";
import { SlantBg } from "@/components/site/slant";
import { cssVars } from "@/lib/utils";

/** the server the bot is in; order-last puts it after the Sync button when the form is a flex row */
export function ServerChip({ name, icon, label, i }: { name: string; icon: string | null; label: string; i: number }) {
  return (
    <div className="in-up relative isolate order-last inline-flex h-10 max-w-full min-w-0 items-center gap-2.5 pr-5 pl-4" style={cssVars({ "--i": i })}>
      <SlantBg className="border-2 border-line" />
      {icon ? (
        <Pfp src={icon} className="size-6" />
      ) : (
        <span aria-hidden className="grid size-6 shrink-0 place-items-center rounded-full bg-slate font-display text-xs font-black leading-none text-paper">
          {name.slice(0, 1).toUpperCase()}
        </span>
      )}
      <span className="flex min-w-0 flex-col gap-1 leading-none">
        <span className="text-[0.625rem] font-display font-bold text-ash">{label}</span>
        <span className="truncate text-sm font-display font-bold text-paper">{name}</span>
      </span>
    </div>
  );
}
