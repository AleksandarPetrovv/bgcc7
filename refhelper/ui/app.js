const { invoke } = window.__TAURI__.core;
const { listen } = window.__TAURI__.event;
const win = window.__TAURI__.window.getCurrentWindow();

const $ = (id) => document.getElementById(id);
const ERR = {
  empty: "enter your osu! username",
  badpass: "wrong irc username or password; get your irc password from osu! settings",
  noirc: "couldn't reach osu! irc; check your internet and try again",
  keyring: "couldn't save the password on this pc; try again",
  wrongname: "that osu! account doesn't match the username you entered",
  timeout: "took too long; try linking again",
  unpaired: "link your osu! account again",
  noref: "this account has no ref role",
  nostream: "this account has no streaming role",
  noroles: "this account has no ref or streaming role",
};
const SITE = { off: ["offline", ""], connecting: ["connecting", "wait"], online: ["online", "ok"] };
const IRC = { idle: ["idle", ""], connecting: ["connecting", "wait"], online: ["online", "ok"], badpass: ["wrong password", "bad"] };
const STREAM = {
  off: ["off", "", "enable streaming to send live scores"],
  waiting: ["waiting for the tourney client", "wait", "open osu!tourney; streamers do not need irc"],
  sending: ["sending", "ok", "live scores are reaching the site"],
  nomatch: ["no match assigned", "wait", "waiting for a match assignment on the site"],
  noplayers: ["no players found", "bad", "no players are in the tourney client yet"],
  players: ["wrong players", "bad", "a player in the lobby isn't on either team of your match"],
  swapped: ["teams on the wrong side", "bad", "team 1 must be red and team 2 blue in the lobby, ask the ref to swap them"],
  map: ["map not in pool", "bad", "the map being played isn't in this match's pool"],
  forbidden: ["streaming unavailable", "bad", "this account needs a streaming role on the site"],
  unpaired: ["account unlinked", "bad", "link your osu! account again to send scores"],
  error: ["streaming error", "bad", "check your internet and the activity log"],
};
const errorText = (e) => ERR[String(e)] ?? "couldn't complete the action; try again and check the activity log";

let screen = null;
let latestStatus = null;
let streamBusy = false;
let unlinkBusy = false;
function show(id) {
  if (screen === id) return;
  const order = ["s-login", "s-wait", "s-run"];
  for (const s of document.querySelectorAll(".screen")) {
    const on = s.id === id;
    s.classList.toggle("on", on);
    s.inert = !on;
    s.classList.toggle("off-left", !on && order.indexOf(s.id) < order.indexOf(id));
    if (on) for (const el of s.querySelectorAll(".in")) {
      el.style.animation = "none";
      void el.offsetWidth;
      el.style.animation = "";
    }
  }
  screen = id;
}

function render(s) {
  latestStatus = s;
  if (unlinkBusy) return;
  if (!s.linked) {
    $("linked-pass").value = "";
    $("pass-note").textContent = "";
    $("pass-err").textContent = "";
    $("stream-err").textContent = "";
    if (screen !== "s-wait") show("s-login");
    return;
  }
  show("s-run");
  const [st, sc] = SITE[s.site] ?? SITE.off;
  const [it, ic] = IRC[s.irc] ?? IRC.idle;
  $("t-site").textContent = st;
  $("d-site").className = `dia ${sc}`;
  $("t-irc").textContent = it;
  $("d-irc").className = `dia ${ic}`;
  $("sent").textContent = s.sent;
  $("me-name").textContent = s.name;
  $("initial").textContent = (s.name[0] ?? "?").toLowerCase();
  $("ref-section").hidden = !s.roles_ready || !s.can_ref;
  $("stream-section").hidden = !s.roles_ready || !s.can_stream;
  const roles = !s.roles_ready ? [] : [s.can_ref && "referee", s.can_stream && "streamer"].filter(Boolean);
  const roleKey = roles.join(",");
  if ($("roles").dataset.k !== roleKey) {
    $("roles").dataset.k = roleKey;
    $("roles").replaceChildren(...roles.map((role) => {
      const badge = document.createElement("span");
      badge.className = "chip";
      const text = document.createElement("span");
      text.textContent = role;
      badge.append(text);
      return badge;
    }));
  }
  $("role-note").textContent = !s.roles_ready
    ? "checking account roles…"
    : !roles.length ? "this account has no ref or streaming role. ask tournament staff to assign one on the site."
    : "";
  $("irc-note").textContent = s.irc === "online"
    ? "irc is online. use this form if you need to replace your saved password."
    : s.irc === "connecting" ? "connecting to irc with the saved password…"
    : "if no password is saved, enter it here to start the ref relay without linking again.";
  const [streamText, streamClass, streamNote] = STREAM[s.stream_state] ?? ["status unavailable", "bad", "check the activity log"];
  $("t-stream").textContent = streamText;
  $("d-stream").className = `dia ${streamClass}`;
  $("stream-note").textContent = streamNote;
  $("stream-match").textContent = s.stream_match ?? "—";
  $("stream-clients").textContent = s.stream_clients ?? 0;
  $("stream-toggle").classList.toggle("on", s.streaming === true);
  $("stream-toggle").setAttribute("aria-checked", String(s.streaming === true));
  $("stream-toggle").disabled = streamBusy || !s.roles_ready || !s.can_stream;
  $("stream-toggle-text").textContent = streamBusy ? "saving…" : s.streaming ? "streaming on" : "streaming off";
  const av = $("avatar");
  const src = s.id ? `https://a.ppy.sh/${s.id}` : "";
  if (av.dataset.src !== src) {
    av.dataset.src = src;
    av.classList.remove("ok");
    if (src) av.src = src;
  }
  const box = $("lobbies");
  const want = s.lobbies.join(",");
  if (box.dataset.k !== want) {
    box.dataset.k = want;
    box.replaceChildren(
      ...(s.lobbies.length
        ? s.lobbies.map((l) => {
            const c = document.createElement("span");
            c.className = "chip";
            c.innerHTML = "<span></span>";
            c.firstChild.textContent = l.replace("#mp_", "#");
            return c;
          })
        : [Object.assign(document.createElement("span"), { className: "muted", textContent: "none open" })]),
    );
  }
}

const hhmm = (ms) => new Date(ms).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
function addLog(e, top = true) {
  const li = document.createElement("li");
  li.className = e.kind;
  li.innerHTML = '<span class="t"></span><span class="m"></span>';
  li.children[0].textContent = hhmm(e.at);
  li.children[1].textContent = e.text;
  li.children[1].title = e.text;
  const log = $("log");
  if (top) log.prepend(li);
  else log.append(li);
  while (log.children.length > 60) log.lastChild.remove();
}

async function syncAuto(on) {
  const btn = $("auto");
  btn.disabled = true;
  try {
    const v = await invoke("autostart", { on });
    btn.classList.toggle("on", v);
    btn.setAttribute("aria-checked", String(v));
  } catch (e) {
    $("run-err").textContent = errorText(e);
  } finally {
    btn.disabled = false;
  }
}

async function action(id, command, args, errorId = "run-err") {
  const btn = $(id);
  if (btn.disabled) return false;
  btn.disabled = true;
  $(errorId).textContent = "";
  try {
    await invoke(command, args);
    return true;
  } catch (e) {
    $(errorId).textContent = errorText(e);
    return false;
  } finally {
    btn.disabled = false;
  }
}

$("avatar").onload = () => $("avatar").classList.add("ok");
$("min").onclick = () => win.minimize();
$("close").onclick = () => win.close();
$("getirc").onclick = () => action("getirc", "open", { what: "irc" }, "login-err");
$("linked-getirc").onclick = () => action("linked-getirc", "open", { what: "irc" }, "pass-err");
$("site").onclick = () => action("site", "open", { what: "site" });
$("reopen").onclick = () => action("reopen", "open", { what: "page" }, "wait-err");
$("auto").onclick = () => syncAuto(!$("auto").classList.contains("on"));

$("stream-toggle").onclick = async () => {
  if (streamBusy || !latestStatus?.linked || !latestStatus.roles_ready || !latestStatus.can_stream) return;
  const on = !latestStatus.streaming;
  streamBusy = true;
  $("stream-err").textContent = "";
  render(latestStatus);
  try {
    await invoke("set_streaming", { on });
    render(await invoke("status"));
  } catch (e) {
    $("stream-err").textContent = errorText(e);
  } finally {
    streamBusy = false;
    if (latestStatus) render(latestStatus);
  }
};

$("irc-form").onsubmit = async (e) => {
  e.preventDefault();
  if ($("save-pass").disabled || !latestStatus?.linked || !latestStatus.roles_ready || !latestStatus.can_ref) return;
  const pass = $("linked-pass").value;
  $("pass-note").textContent = "";
  if (!pass.trim()) {
    $("pass-err").textContent = "enter your irc password";
    return;
  }
  $("linked-pass").value = "";
  if (await action("save-pass", "save_irc_password", { pass }, "pass-err")) {
    $("pass-note").textContent = "irc password saved. waiting for the relay status…";
  }
};

$("go").onclick = async () => {
  const btn = $("go");
  if (btn.disabled || unlinkBusy) return;
  $("login-err").textContent = "";
  const name = $("name").value.trim();
  if (!name) {
    $("login-err").textContent = ERR.empty;
    return;
  }
  btn.disabled = true;
  const pass = $("pass").value;
  $("pass").value = "";
  try {
    const word = await invoke("link", { name, pass });
    $("word").textContent = word;
    $("wait-err").textContent = "";
    $("pass").value = "";
    if (latestStatus?.linked) show("s-run");
    else show("s-wait");
  } catch (e) {
    $("login-err").textContent = errorText(e);
  } finally {
    btn.disabled = false;
  }
};
for (const id of ["name", "pass"]) $(id).addEventListener("keydown", (e) => e.key === "Enter" && $("go").click());

for (const b of document.querySelectorAll("[data-uninstall]")) b.onclick = () => ($("modal").hidden = false);
$("un-no").onclick = () => ($("modal").hidden = true);
$("modal").onclick = (e) => e.target === $("modal") && ($("modal").hidden = true);
$("un-yes").onclick = async () => {
  await action("un-yes", "uninstall", undefined, "un-err");
};

$("cancel").onclick = async () => {
  if (await action("cancel", "cancel_link", undefined, "wait-err")) show("s-login");
};

$("unlink").onclick = async () => {
  if (unlinkBusy || $("unlink").disabled) return;
  unlinkBusy = true;
  const label = $("unlink").textContent;
  $("unlink").textContent = "unlinking…";
  try {
    if (!await action("unlink", "unlink")) return;
    latestStatus = null;
    $("linked-pass").value = "";
    $("pass-note").textContent = "";
    $("pass-err").textContent = "";
    $("stream-err").textContent = "";
    $("log").replaceChildren();
    show("s-login");
  } finally {
    unlinkBusy = false;
    $("unlink").textContent = label;
    if (latestStatus) render(latestStatus);
  }
};

(async () => {
  show("s-login");
  try {
    await listen("status", (e) => render(e.payload));
    await listen("log", (e) => addLog(e.payload));
    await listen("linked", async () => {
      try {
        render(await invoke("status"));
      } catch (e) {
        $("run-err").textContent = errorText(e);
      }
      syncAuto();
    });
    await listen("link_error", (e) => {
      $("wait-err").textContent = errorText(e.payload);
    });
    $("name").value = await invoke("saved_name");
    for (const e of await invoke("logs")) addLog(e, false);
    render(await invoke("status"));
    await syncAuto();
  } catch (e) {
    $(screen === "s-run" ? "run-err" : "login-err").textContent = errorText(e);
  }
})();
