"use client";

import { useEffect, useState } from "react";
import { Send } from "lucide-react";
import { useDict } from "@/components/site/lang";
import type { LobbyView } from "@/lib/bancho";
import { cn } from "@/lib/utils";
import { lobbyPost } from "./lobby-popups";
import { useChatHistory } from "./use-chat-history";

type ChatProps = {
  slug: string;
  mpId: number | null;
  lines: LobbyView["chat"];
  sides: Map<string, "red" | "blue">;
  disabled: boolean;
  readOnly?: boolean;
  canSay: boolean;
  text: string;
  setText: (s: string) => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
};

export function Chat(props: ChatProps) {
  return <ChatSession key={`${props.slug}:${props.mpId ?? "none"}`} {...props} />;
}

function ChatSession({
  slug,
  mpId,
  lines,
  sides,
  disabled,
  text,
  setText,
  inputRef,
  readOnly,
  canSay,
}: ChatProps) {
  const t = useDict();
  const [until, setUntil] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const [busy, setBusy] = useState(false);
  const [fail, setFail] = useState<boolean | "noslot" | "nouser" | "blocked">(false);
  const { box, entries, page, loadMore, onScroll } = useChatHistory(slug, mpId, lines);

  useEffect(() => {
    if (until <= now) return;
    const id = setTimeout(() => setNow(Date.now()), 250);
    return () => clearTimeout(id);
  }, [until, now]);

  const left = Math.max(0, Math.ceil((until - now) / 1000));
  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() || left || busy) return;
    setBusy(true);
    setFail(false);
    const sent = text;
    const res = await lobbyPost(slug, { act: readOnly ? "say" : "chat", text: sent });
    setBusy(false);
    if (res?.ok) {
      const t0 = Date.now();
      setNow(t0);
      setUntil(t0 + 1500);
      if (inputRef.current?.value === sent) setText("");
    } else setFail(res?.error === "noslot" || res?.error === "nouser" || res?.error === "blocked" ? res.error : true);
    inputRef.current?.focus();
  }

  return (
    <div className="border-t border-line">
      <div ref={box} onScroll={onScroll} className="h-[25rem] overflow-y-auto px-3 py-2 text-[0.95rem] [overflow-anchor:none]">
        {(page.hasMore || page.loading || page.failed) && (
          <div className="flex min-h-9 items-center justify-center gap-2 pb-2 text-xs font-bold text-ash" aria-live="polite">
            {page.loading ? t.lobby.chatLoading : page.failed ? <><span>{t.lobby.chatLoadFailed}</span><button type="button" onClick={() => void loadMore()} className="underline underline-offset-2 hover:text-paper">{t.error.retry}</button></> : <button type="button" onClick={() => void loadMore()} className="underline underline-offset-2 hover:text-paper">{t.lobby.chatLoadMore}</button>}
          </div>
        )}
        {entries.length ? (
          entries.map((m) => {
            const bancho = m.from === "BanchoBot";
            const side = m.side === 1 ? "red" : m.side === 2 ? "blue" : sides.get(m.from.toLowerCase());
            return (
              <p key={m.key} data-chat-key={m.key} className={cn("break-words py-0.5 leading-snug", m.ref && !bancho && "-mx-3 border-l-2 border-balkan-deep bg-balkan/20 px-3")}>
                <span className="num mr-2 text-xs text-ash">{new Date(m.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                <span className={cn("font-display font-black", bancho ? "text-gold-hi" : m.ref ? "text-balkan-hi" : side === "red" ? "text-crimson-hi" : side === "blue" ? "text-azure-hi" : "text-paper")}>{m.from.replace(/_/g, " ")}</span>
                <span className={cn("ml-2", bancho ? "text-paper/70" : "text-paper")}>{m.text}</span>
              </p>
            );
          })
        ) : (
          <p className="py-6 text-center text-xs font-display font-bold text-ash">{t.lobby.quiet}</p>
        )}
      </div>
      {(fail === "noslot" || fail === "nouser" || fail === "blocked") && (
        <p className="border-t border-line bg-rose/10 px-3 py-1.5 text-xs font-display font-bold text-rose-hi">{fail === "noslot" ? t.lobby.noSlot : fail === "nouser" ? t.lobby.noUser : t.lobby.blocked}</p>
      )}
      {canSay && (
      <form onSubmit={send} className="flex gap-2 border-t border-line px-3 py-2">
        <span className={cn("flex min-w-0 flex-1 -skew-x-12 border border-line bg-field focus-within:border-paper", fail && "border-rose focus-within:border-rose")}>
        <input
          ref={inputRef}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            if (fail) setFail(false);
          }}
          maxLength={300}
          autoComplete="off"
          disabled={disabled}
          placeholder={readOnly ? t.lobby.sayPlayer : t.lobby.say}
          className="adm-bare min-w-0 flex-1 skew-x-12 border-0 bg-transparent px-4 py-2 text-[0.95rem] outline-none placeholder:text-ash"
        />
        </span>
        <button
          type="submit"
          disabled={disabled || busy || !!left || !text.trim()}
          className="inline-flex min-h-8 min-w-20 -skew-x-12 items-center justify-center border border-balkan bg-balkan px-3 text-xs font-display font-bold text-paper transition-colors hover:bg-paper hover:text-ink disabled:opacity-50"
        >
          <span className="inline-flex skew-x-12 items-center gap-1.5">{left ? <span className="num">{left}s</span> : <><Send className="size-3.5" /> {t.lobby.send}</>}</span>
        </button>
      </form>
      )}
    </div>
  );
}
