import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { Alerts, validAlerts, type Alert } from "./alerts";
import { errorText, IRC, SITE, STREAM } from "./text";

type Status = {
  linked: boolean;
  name: string;
  id?: number;
  site: string;
  irc: string;
  lobbies: string[];
  sent: number;
  can_ref?: boolean;
  can_stream?: boolean;
  roles_ready?: boolean;
  streaming?: boolean;
  stream_state?: string;
  stream_match?: string | null;
  stream_clients?: number;
};
type Entry = { kind: string; at: number; text: string };
type Screen = "s-login" | "s-wait" | "s-run";
type Tab = "ref" | "stream";

const ORDER: Screen[] = ["s-login", "s-wait", "s-run"];
const win = getCurrentWindow();
const hhmm = (ms: number) => new Date(ms).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
const savedTab = (): Tab | null => {
  try {
    const t = localStorage.getItem("tab");
    return t === "ref" || t === "stream" ? t : null;
  } catch {
    return null;
  }
};
// log lines come from the backend in lowercase; keep osu!, commands and channels as they are
const sentence = (t: string) => (/^(osu!|[!#])/.test(t) ? t : t.charAt(0).toUpperCase() + t.slice(1));
const cn = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");
const stagger = (i: number) => ({ "--i": i }) as React.CSSProperties;

function Btn({ kind = "outline", size, className, children, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement> & { kind?: "rose" | "outline"; size?: "sm" | "big" }) {
  return (
    <button type="button" className={cn("btn", `btn-${kind}`, size && `btn-${size}`, className)} {...rest}>
      <span>{children}</span>
    </button>
  );
}

function Toggle({ on, className, children, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement> & { on: boolean }) {
  return (
    <button type="button" role="switch" aria-checked={on} className={cn("inline-flex items-center gap-2.5 whitespace-nowrap font-display text-[11px] font-bold", on ? "on text-paper" : "text-ash", className)} {...rest}>
      <span className="toggle-sw" aria-hidden="true" />
      {children}
    </button>
  );
}

const Err = ({ text, id }: { text: string; id?: string }) => (text ? <div id={id} role="alert" className="min-h-[18px] text-[12.5px] font-extrabold text-rose-hi">{text}</div> : null);
const Help = ({ text, role }: { text: string; role?: string }) => (text ? <p role={role} className="text-[12.5px] leading-normal text-ash">{text}</p> : null);
const Chip = ({ text }: { text: string }) => (
  <span className="slant px-2 py-[3px] font-display text-xs font-black [--sl-bg:var(--slate)] [--sl-shadow:inset_3px_0_0_var(--rose)]">{text}</span>
);
const Stat = ({ k, children }: { k: string; children: React.ReactNode }) => (
  <div className="flex min-w-0 flex-col gap-1.5">
    <span className="font-display text-[10px] font-bold text-ash">{k}</span>
    {children}
  </div>
);
const rule = "border-b border-line pb-4";
// segmented trapezoid like the site's EN/BG and theme switches
function Seg({ on, label, disabled, onPick }: { on: boolean; label: string; disabled?: boolean; onPick: (on: boolean) => void }) {
  return (
    <div className={cn("slant flex h-8 shrink-0 font-display text-[11px] font-black [--sl-line:var(--line)]", disabled && "opacity-60")} role="group" aria-label={label}>
      {[false, true].map((v) => (
        <button
          key={String(v)}
          type="button"
          aria-pressed={on === v}
          disabled={disabled}
          onClick={() => on !== v && onPick(v)}
          className={cn("slant px-3 transition-colors", on === v ? (v ? "text-ink [--sl-bg:var(--balkan)]" : "text-ink [--sl-bg:var(--paper)]") : "text-ash hover:text-paper")}
        >
          {v ? "On" : "Off"}
        </button>
      ))}
    </div>
  );
}
const LOG_DOT: Record<string, string> = { ok: "bg-balkan", warn: "bg-gold", err: "bg-rose", cmd: "bg-paper" };

function Tabs({ tabs, current, onPick }: { tabs: readonly Tab[]; current?: Tab; onPick: (t: Tab) => void }) {
  const refs = useRef<Partial<Record<Tab, HTMLButtonElement | null>>>({});
  const [bar, setBar] = useState({ l: 0, w: 0 });
  useLayoutEffect(() => {
    const measure = () => {
      const b = current && refs.current[current];
      if (b) setBar({ l: b.offsetLeft, w: b.offsetWidth });
    };
    measure();
    document.fonts?.ready.then(measure);
  }, [current, tabs]);
  return (
    <div role="tablist" className="relative flex gap-x-6">
      {tabs.map((t) => (
        <button
          key={t}
          ref={(el) => {
            refs.current[t] = el;
          }}
          type="button"
          role="tab"
          aria-selected={current === t}
          onClick={() => onPick(t)}
          className={cn("pb-2 font-display text-sm font-black transition-colors duration-300", current === t ? "text-paper" : "text-ash hover:text-paper/80")}
        >
          {t === "ref" ? "Referee" : "Streamer"}
        </button>
      ))}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute bottom-0 left-0 h-[3px] -skew-x-12 transition-[translate,width,background-color] duration-500 ease-[cubic-bezier(0.65,0,0.35,1)]"
        style={{ width: bar.w, translate: `${bar.l}px 0`, background: current === "stream" ? "var(--balkan)" : "var(--rose)" }}
      />
    </div>
  );
}
const Value = ({ dot, text }: { dot: string; text: React.ReactNode }) => (
  <span className="flex items-center gap-[9px] font-display text-[15px] font-bold [overflow-wrap:anywhere]">
    <i className={cn("dia", dot)} />
    <span role="status">{text}</span>
  </span>
);

export function App() {
  const [status, setStatus] = useState<Status | null>(null);
  const [screen, setScreen] = useState<Screen>("s-login");
  const [visits, setVisits] = useState(0);
  const [word, setWord] = useState("····");
  const [err, setErr] = useState({ login: "", wait: "", run: "", pass: "", stream: "" });
  const [passNote, setPassNote] = useState("");
  const [pass, setPass] = useState("");
  const [tab, setTab] = useState<Tab | null>(savedTab);
  const [streamBusy, setStreamBusy] = useState(false);
  const [unlinkBusy, setUnlinkBusy] = useState(false);
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const [auto, setAuto] = useState(false);
  const [logs, setLogs] = useState<Entry[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [avatarOk, setAvatarOk] = useState(false);
  const alertRev = useRef(0);
  const screenRef = useRef(screen);

  const fail = (key: keyof typeof err, text: string) => setErr((e) => ({ ...e, [key]: text }));
  const show = (id: Screen) => {
    if (screenRef.current === id) return;
    screenRef.current = id;
    setScreen(id);
    setVisits((v) => v + 1);
  };

  const action = async (id: string, command: string, args?: Record<string, unknown>, errKey: keyof typeof err = "run") => {
    if (busy[id]) return false;
    setBusy((b) => ({ ...b, [id]: true }));
    fail(errKey, "");
    try {
      await invoke(command, args);
      return true;
    } catch (e) {
      fail(errKey, errorText(e));
      return false;
    } finally {
      setBusy((b) => ({ ...b, [id]: false }));
    }
  };

  const syncAuto = async (on?: boolean) => {
    setBusy((b) => ({ ...b, auto: true }));
    try {
      setAuto(await invoke<boolean>("autostart", { on }));
    } catch (e) {
      fail("run", errorText(e));
    } finally {
      setBusy((b) => ({ ...b, auto: false }));
    }
  };

  useEffect(() => {
    if (!status || unlinkBusy) return;
    if (!status.linked) {
      setPass("");
      setPassNote("");
      setErr((e) => ({ ...e, pass: "", stream: "" }));
      if (screenRef.current !== "s-wait") show("s-login");
    } else show("s-run");
  }, [status, unlinkBusy]);

  useEffect(() => {
    let alive = true;
    const offs: (() => void)[] = [];
    (async () => {
      try {
        offs.push(await listen<Status>("status", (e) => setStatus(e.payload)));
        offs.push(await listen<Entry>("log", (e) => setLogs((l) => [e.payload, ...l].slice(0, 60))));
        offs.push(
          await listen("alerts", (e) => {
            const a = validAlerts(e.payload);
            if (!a) return;
            alertRev.current++;
            setAlerts(a);
          }),
        );
        const rev = alertRev.current;
        const first = validAlerts(await invoke("alerts"));
        if (first && rev === alertRev.current) setAlerts(first);
        offs.push(
          await listen("linked", async () => {
            try {
              setStatus(await invoke<Status>("status"));
            } catch (e) {
              fail("run", errorText(e));
            }
            syncAuto();
          }),
        );
        offs.push(await listen("link_error", (e) => fail("wait", errorText(e.payload))));
        const past = await invoke<Entry[]>("logs");
        if (alive) setLogs((l) => [...l, ...past].slice(0, 60));
        setStatus(await invoke<Status>("status"));
        await syncAuto();
      } catch (e) {
        fail(screenRef.current === "s-run" ? "run" : "login", errorText(e));
      }
    })();
    return () => {
      alive = false;
      offs.forEach((off) => off());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!passNote) return;
    const id = setTimeout(() => setPassNote(""), 8000);
    return () => clearTimeout(id);
  }, [passNote]);

  const s = status;
  // only the sections this account's roles allow; roles refresh from the site poll
  const tabs = !s?.roles_ready ? [] : (["ref", "stream"] as const).filter((t) => (t === "ref" ? s.can_ref : s.can_stream));
  const current: Tab | undefined = tab && tabs.includes(tab) ? tab : tabs[0];
  const [siteText, siteDot] = SITE[s?.site ?? "off"] ?? SITE.off;
  const [ircText, ircDot] = s?.irc === "idle" && s?.site === "online" ? (["Ready", "ok"] as const) : (IRC[s?.irc ?? "idle"] ?? IRC.idle);
  const [streamText, streamDot, streamNote] = STREAM[s?.stream_state ?? ""] ?? ["Status unavailable", "bad", "Check the activity log"];
  const avatar = s?.id ? `https://a.ppy.sh/${s.id}` : "";
  const [avatarFor, setAvatarFor] = useState("");
  if (avatarFor !== avatar) {
    setAvatarFor(avatar);
    setAvatarOk(false);
  }

  const pickTab = (t: Tab) => {
    setTab(t);
    try {
      localStorage.setItem("tab", t);
    } catch {}
    invoke("recheck_roles").catch(() => {});
  };

  const toggleStream = async () => {
    if (streamBusy || !s?.linked || !s.roles_ready || !s.can_stream) return;
    setStreamBusy(true);
    fail("stream", "");
    try {
      await invoke("set_streaming", { on: !s.streaming });
      setStatus(await invoke<Status>("status"));
    } catch (e) {
      fail("stream", errorText(e));
    } finally {
      setStreamBusy(false);
    }
  };

  const savePass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy["save-pass"] || !s?.linked || !s.roles_ready || !s.can_ref) return;
    setPassNote("");
    if (!pass.trim()) return fail("pass", "Enter your IRC password");
    const value = pass;
    setPass("");
    if (await action("save-pass", "save_irc_password", { pass: value }, "pass")) setPassNote("IRC password saved. osu! IRC connects when a lobby opens.");
  };

  const link = async () => {
    if (busy.go || unlinkBusy) return;
    fail("login", "");
    setBusy((b) => ({ ...b, go: true }));
    try {
      setWord(await invoke<string>("link"));
      fail("wait", "");
      show(s?.linked ? "s-run" : "s-wait");
    } catch (e) {
      fail("login", errorText(e));
    } finally {
      setBusy((b) => ({ ...b, go: false }));
    }
  };

  const unlink = async () => {
    if (unlinkBusy || busy.unlink) return;
    setUnlinkBusy(true);
    try {
      if (!(await action("unlink", "unlink"))) return;
      setStatus(null);
      setPass("");
      setPassNote("");
      setErr((e) => ({ ...e, pass: "", stream: "" }));
      setLogs([]);
      show("s-login");
    } finally {
      setUnlinkBusy(false);
    }
  };

  const screenCls = (id: Screen) =>
    cn("screen thin-scroll absolute inset-0 flex flex-col gap-4 overflow-y-auto p-[22px] *:shrink-0", screen === id && "on", screen !== id && ORDER.indexOf(id) < ORDER.indexOf(screen) && "off-left");
  const [dark, setDark] = useState(() => document.documentElement.classList.contains("dark"));
  const setTheme = (on: boolean) => {
    document.documentElement.classList.toggle("dark", on);
    localStorage.setItem("theme", on ? "dark" : "light");
    setDark(on);
  };
  const screenKey = (id: Screen) => (screen === id ? `${id}-${visits}` : id);

  return (
    <>
      <div className="flex h-full flex-col border border-line">
        <header className="flex h-[34px] shrink-0 items-center gap-2.5 border-b border-line bg-coal pl-3" data-tauri-drag-region>
          <svg className="size-3.5" viewBox="0 0 24 24" aria-hidden="true">
            <rect x="6" y="6" width="12" height="12" rx="2" fill="none" stroke="var(--paper)" strokeWidth="2.6" />
            <circle cx="12" cy="12" r="2.6" fill="var(--rose)" />
            <circle cx="19" cy="5" r="2.2" fill="var(--balkan)" />
          </svg>
          <span className="flex-1 font-display text-[10px] font-bold text-ash" data-tauri-drag-region>
            BGCC7 Helper
          </span>
          <div className="flex h-full">
            <button type="button" title="Minimize to tray" aria-label="Minimize to tray" onClick={() => win.minimize()} className="grid h-full w-[42px] place-items-center text-ash transition-colors hover:bg-slate hover:text-paper">
              <svg viewBox="0 0 12 12" className="size-[11px]"><path d="M1 6h10" stroke="currentColor" strokeWidth="1.6" /></svg>
            </button>
            <button type="button" title="Quit" aria-label="Quit" onClick={() => win.close()} className="grid h-full w-[42px] place-items-center text-ash transition-colors hover:bg-rose hover:text-white">
              <svg viewBox="0 0 12 12" className="size-[11px]"><path d="M1.5 1.5l9 9M10.5 1.5l-9 9" stroke="currentColor" strokeWidth="1.6" /></svg>
            </button>
          </div>
        </header>

        <section className="grain relative flex shrink-0 flex-col items-center overflow-hidden border-b border-line px-[22px] pb-3 pt-3.5" data-tauri-drag-region>
          <div className="anim-page pointer-events-none absolute -right-[4%] top-1/2 -translate-y-1/2 font-display text-[230px] font-black italic leading-[0.8] text-rose/[0.08]" aria-hidden="true">
            7
          </div>
          <div className="relative flex items-end font-display text-[42px] font-black lowercase" data-tauri-drag-region>
            <div className="whitespace-nowrap leading-[0.8] tracking-[-0.05em]">
              {"bgcc".split("").map((l, i) => (
                <span key={i} className="anim-letter inline-block" style={{ animationDelay: `${0.05 + i * 0.07}s` }}>
                  {l}
                </span>
              ))}
            </div>
            <span className="num7 relative mb-[-0.06em] ml-[0.04em] text-[1.45em] italic leading-[0.74] tracking-[-0.06em]">
              <span className="num7-echo absolute left-[0.05em] top-[0.035em] pr-[0.3em] text-transparent" aria-hidden="true">7</span>
              <span className="relative mr-[-0.3em] pr-[0.3em] text-rose">7</span>
              <span className="num7-shine pointer-events-none absolute -left-[0.3em] -top-[0.3em] py-[0.3em] pl-[0.3em] pr-[0.7em] text-transparent" aria-hidden="true">7</span>
            </span>
          </div>
          <span className="anim-pop slant mt-2.5 inline-flex px-2.5 py-1 font-display text-[11px] font-bold text-white [--sl-bg:var(--rose)] [animation-delay:0.8s]">Helper</span>
        </section>

        <div className="flex shrink-0 justify-center pt-3">
          <div className="slant flex h-7 [--sl-line:var(--line)]" role="group" aria-label="Theme">
            {[false, true].map((on) => (
              <button
                key={String(on)}
                type="button"
                aria-pressed={dark === on}
                aria-label={on ? "Dark mode" : "Light mode"}
                title={on ? "Dark mode" : "Light mode"}
                onClick={() => setTheme(on)}
                className={cn("slant grid w-9 place-items-center transition-colors", dark === on ? "text-ink [--sl-bg:var(--paper)]" : "text-ash hover:text-paper")}
              >
                {on ? <svg viewBox="0 0 24 24" className="size-[13px]" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinejoin="round"><path d="M20.5 14.5A8.5 8.5 0 1 1 9.5 3.5a7 7 0 0 0 11 11Z" /></svg> : <svg viewBox="0 0 24 24" className="size-[13px]" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>}
              </button>
            ))}
          </div>
        </div>

        <main className="relative min-h-0 flex-1">
          <section key={screenKey("s-login")} className={screenCls("s-login")} inert={screen !== "s-login"}>
            <div className="heading in" style={stagger(0)}>Link your account</div>
            <p className="in text-[12.5px] leading-normal text-ash" style={stagger(1)}>Log in with osu! on the site and this PC links to your account.</p>
            <Err text={err.login} />
            <div className="in flex flex-wrap items-center gap-3" style={stagger(4)}>
              <Btn kind="rose" size="big" disabled={busy.go} onClick={link}>
                Link with osu!
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
              </Btn>
            </div>
          </section>

          <section key={screenKey("s-wait")} className={screenCls("s-wait")} inert={screen !== "s-wait"}>
            <div className="heading in" style={stagger(0)}>Type this code on the site</div>
            <div className={cn("in pt-1", rule)} style={stagger(1)}>
              <span className="num block select-text break-all text-[30px] text-paper">{word}</span>
            </div>
            <div className="beads in" style={stagger(1)} aria-hidden="true" />
            <Err text={err.wait} />
            <div className="in flex flex-wrap items-center gap-3" style={stagger(2)}>
              <Btn disabled={busy.reopen} onClick={() => action("reopen", "open", { what: "page" }, "wait")}>Open the page again</Btn>
              <Btn
                disabled={busy.cancel}
                onClick={async () => {
                  if (await action("cancel", "cancel_link", undefined, "wait")) show("s-login");
                }}
              >
                Cancel
              </Btn>
            </div>
          </section>

          <section key={screenKey("s-run")} className={screenCls("s-run")} inert={screen !== "s-run"}>
            <div className={cn("in flex items-center gap-3.5", rule)} style={stagger(0)}>
              <span className="anim-spin-in relative grid size-[50px] shrink-0 place-items-center overflow-hidden rounded-full bg-slate shadow-[0_0_0_2px_var(--ink),0_0_0_4px_color-mix(in_srgb,var(--rose)_45%,transparent)]">
                <b className="font-display text-xl font-black text-ash">{(s?.name?.[0] ?? "?").toLowerCase()}</b>
                {avatar && <img key={avatar} src={avatar} alt="" onLoad={() => setAvatarOk(true)} className={cn("absolute inset-0 size-full object-cover transition-opacity duration-400", avatarOk ? "opacity-100" : "opacity-0")} />}
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-[5px]">
                <span className="font-display text-[10px] font-bold text-ash">Linked account</span>
                <span className="heading truncate !text-[26px]">{s?.name ?? "—"}</span>
              </span>
              <span className="flex shrink-0 flex-col items-end gap-[5px]">
                <span className="font-display text-[10px] font-bold text-ash">Site</span>
                <Value dot={siteDot} text={siteText} />
              </span>
            </div>
            <Help role="status" text={!s?.roles_ready ? "Checking account roles…" : ""} />
            {s?.roles_ready && !tabs.length && (
              <div className="flex flex-col gap-1.5">
                <span className="font-display text-[13px] font-bold text-rose-hi">No roles yet</span>
                <Help text="This account has no referee or streamer role. Ask tournament staff to assign one on the site, it shows up here by itself." />
              </div>
            )}
            {tabs.length > 1 && (
              <div className="in" style={stagger(1)}>
                <Tabs tabs={tabs} current={current} onPick={pickTab} />
              </div>
            )}

            {s && current === "ref" && (
              <section className="flex min-w-0 flex-col pt-1">
                <div className="in grid grid-cols-3 gap-3 pb-4" style={stagger(0)}>
                  <Stat k="osu! IRC">
                    <Value dot={ircDot} text={s.irc === "online" && s.lobbies.length ? "In lobby" : ircText} />
                  </Stat>
                  <Stat k="Lobbies">
                    <div className="flex flex-wrap gap-1.5">
                      {s.lobbies.length ? s.lobbies.map((l) => <Chip key={l} text={l.replace("#mp_", "#")} />) : <span className="font-display text-[12.5px] font-bold text-ash">No lobbies</span>}
                    </div>
                  </Stat>
                  <Stat k="Commands sent">
                    <span className="num text-[30px] leading-[0.9]">{s.sent}</span>
                  </Stat>
                </div>
                {/* only while no working password is saved; collapses with its separator once IRC accepts it */}
                <div className={cn("collapse-y", s.irc !== "badpass" && "shut")} inert={s.irc !== "badpass"}>
                <div>
                <form className="flex min-w-0 flex-col gap-3 border-t border-line pb-2 pt-4" onSubmit={savePass}>
                  <div className="in" style={stagger(1)}>
                    <Help text="Save your IRC password to run lobbies from the site." />
                  </div>
                  <label style={stagger(2)} className="in flex flex-col gap-[7px] font-display text-[10.5px] font-bold text-ash transition-colors focus-within:text-paper">
                    IRC password
                    <span className="field">
                      <input type="password" autoComplete="off" value={pass} onChange={(e) => setPass(e.target.value)} className="w-full select-text border-0 bg-transparent px-3.5 font-display text-sm font-semibold text-paper outline-0" />
                    </span>
                  </label>
                  <div className="in flex flex-wrap items-center gap-3" style={stagger(3)}>
                    <Btn size="sm" type="submit" disabled={busy["save-pass"]}>Save IRC password</Btn>
                    <button type="button" disabled={busy["linked-getirc"]} onClick={() => action("linked-getirc", "open", { what: "irc" }, "pass")} className="self-center font-display text-[11.5px] font-bold text-ash underline decoration-line underline-offset-[3px] transition-colors hover:text-rose-hi hover:decoration-rose-hi">
                      Get your IRC password
                    </button>
                  </div>
                  <Err text={err.pass} />
                </form>
                </div>
                </div>
                {passNote && (
                  <div className="in pt-1">
                    <Help role="status" text={passNote} />
                  </div>
                )}
              </section>
            )}

            {s && current === "stream" && (
              <section className="flex min-w-0 flex-col gap-3 pt-1">
                <div className="in flex items-center gap-3" style={stagger(0)}>
                  <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                    <Value dot={streamDot} text={streamText} />
                    <Help text={streamNote} />
                  </div>
                  <Seg label="Streaming" on={s.streaming === true} disabled={streamBusy} onPick={() => toggleStream()} />
                </div>
                <dl className="flex flex-col gap-2 text-xs">
                  {[
                    ["Assigned match", s.stream_match ?? "—"],
                    ["Clients detected", String(s.stream_clients ?? 0)],
                  ].map(([k, v], i) => (
                    <div key={k} className="in flex flex-wrap justify-between gap-2" style={stagger(i + 1)}>
                      <dt className="font-display font-bold text-ash">{k}</dt>
                      <dd className="num min-w-0 select-text [overflow-wrap:anywhere]">{v}</dd>
                    </div>
                  ))}
                </dl>
                <Err text={err.stream} />
              </section>
            )}

            <div className="sec in mt-3" style={stagger(5)}>Activity</div>
            <ul className="thin-scroll flex max-h-[180px] min-h-[70px] flex-col gap-0.5 overflow-y-auto">
              {logs.map((e, i) => (
                <li key={`${e.at}-${i}-${e.text}`} className="anim-left flex items-center gap-2.5 py-1 text-[12.5px]">
                  <i aria-hidden="true" className={cn("size-[7px] shrink-0 rotate-45", LOG_DOT[e.kind] ?? "bg-line")} />
                  <span className="num shrink-0 text-ash">{hhmm(e.at)}</span>
                  <span title={sentence(e.text)} className={cn("min-w-0 select-text truncate", e.kind === "cmd" ? "font-extrabold" : "font-semibold")}>
                    {sentence(e.text)}
                  </span>
                </li>
              ))}
            </ul>
            <div className="in mt-auto flex flex-wrap items-center gap-3 pt-1.5" style={stagger(6)}>
              <Toggle on={auto} disabled={busy.auto} onClick={() => syncAuto(!auto)}>
                Start with Windows
              </Toggle>
              <span className="flex-1" />
              <Btn size="sm" disabled={busy.site} onClick={() => action("site", "open", { what: "site" })}>Open BGCC</Btn>
              <Btn size="sm" disabled={busy.unlink} onClick={unlink}>{unlinkBusy ? "Unlinking…" : "Log out"}</Btn>
            </div>
            <Err text={err.run} />
          </section>
        </main>
      </div>

      <Alerts alerts={alerts} />
    </>
  );
}
