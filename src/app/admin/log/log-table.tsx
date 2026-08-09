import type { LogRow } from "@/db/admin";
import { fmtSofia } from "@/lib/time";

const short = (p: unknown) => {
  if (p === null || p === undefined) return "";
  const s = JSON.stringify(p);
  return s.length > 140 ? `${s.slice(0, 140)}…` : s;
};

export function LogTable({ rows, lang, empty, head }: { rows: LogRow[]; lang: string; empty: string; head: [string, string, string] }) {
  if (!rows.length) return <p className="border border-line bg-coal p-4 text-sm text-ash">{empty}</p>;
  return (
    <div className="overflow-x-auto border border-line">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate text-left text-[0.65rem] font-black uppercase text-ash">
            {head.map((h) => (
              <th key={h} className="px-3 py-2">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-t border-line align-top">
              <td className="num whitespace-nowrap px-3 py-2 text-ash">{fmtSofia(r.at, lang === "bg" ? "bg-BG" : "en-GB")}</td>
              <td className="whitespace-nowrap px-3 py-2 font-bold">{r.username ?? r.osuId}</td>
              <td className="px-3 py-2">
                <span className="font-bold">{r.action}</span> <span className="break-all text-xs text-ash">{short(r.payload)}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
