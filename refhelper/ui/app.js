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
const IRC = { idle: ["standby", ""], connecting: ["connecting", "wait"], online: ["online", "ok"], badpass: ["wrong password", "bad"] };
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

const ALERT_TEXT = {
  ircLost: {
    title: "Lobby lost its osu! connection",
    means: "The site can't talk to the match lobby, so picks, bans and scores won't reach osu!. The lobby itself is still open in osu!.",
    steps: [
      "Close the osu! tournament client, it blocks the helper's login.",
      "Press Make lobby on the match page. It reconnects to the same lobby.",
      "Open the tournament client again once the lobby is back.",
    ],
    button: "Open match",
  },
  helperOffline: {
    title: "Your BGCC7 Helper is offline",
    means: "Your match lobby is open, but the site can't reach your helper, so the lobby can't be controlled from the site.",
    steps: [
      "Open BGCC7 Helper on your PC.",
      "Check it shows connected and you're signed in.",
      "Not installed? Download it with the button below.",
    ],
    button: "Download helper",
  },
  finishFailed: {
    title: "Match result wasn't saved",
    means: "The match reached its winning score, but saving the result failed, so the bracket didn't move on.",
    steps: ["Press Retry.", "If it fails again, set the score and winner by hand in Admin → Matches."],
    button: "Open match admin",
  },
  bracketBlocked: {
    title: "Bracket correction is blocked",
    means: "A changed result would put a different team into matches that are already played or in progress, so the bracket was left as it was.",
    steps: [
      "Check the matches listed below.",
      "If they really need to change, clear their result in Admin → Matches, then save the corrected match again.",
      "Otherwise put the old result back.",
    ],
    button: "Open matches",
  },
  scoresStale: {
    title: "Scores aren't updating",
    means: "The site hasn't been able to load this match's scores from osu! for over 2 minutes.",
    steps: ["Check the mp link on the match is right.", "osu! may be having API problems. Scores catch up on their own once it works again."],
    button: "Open match admin",
  },
  overlayFailing: {
    title: "Stream overlay isn't updating",
    means: "The overlay's data feed has been failing for over a minute, so the stream may show old info.",
    steps: ["Refresh the browser source in OBS.", "Check the scene in Admin → Stream."],
    button: "Open stream admin",
  },
  siteDown: {
    title: "Can't reach the site",
    means: "The helper hasn't reached the site for over a minute.",
    steps: [
      "The osu! lobby keeps running, keep refereeing in osu! directly.",
      "Check this PC's internet.",
      "Picks and scores can be fixed on the site once it's back.",
    ],
  },
};
let latestAlerts = [];
let alertRevision = 0;
let alertsExpanded = false;
let alertExpiry;
const alertSnoozes = new Map();
const alertCards = new Map();

function alertElement(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function alertCard(alert) {
  const text = ALERT_TEXT[alert.kind];
  const card = alertElement("article", `alert-card ${alert.level}`);
  const title = alertElement("h2", "alert-title", text.title);
  const titleId = `alert-title-${alert.id}`;
  title.id = titleId;
  card.setAttribute("aria-labelledby", titleId);
  const close = alertElement("button", "alert-close");
  close.type = "button";
  const minutes = alert.level === "red" ? 10 : 30;
  close.title = `Snooze for ${minutes} minutes`;
  close.setAttribute("aria-label", close.title);
  close.innerHTML = '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M1.5 1.5l9 9M10.5 1.5l-9 9" fill="none" stroke="currentColor" stroke-width="1.6" /></svg>';
  close.onclick = () => {
    alertSnoozes.set(alert.id, Date.now() + minutes * 60_000);
    renderAlerts();
  };
  card.append(close, title);
  if (alert.match?.label) card.append(alertElement("p", "alert-match", alert.match.label));
  card.append(alertElement("p", "alert-means", text.means));
  const steps = alertElement("ol", "alert-steps");
  for (const step of text.steps) steps.append(alertElement("li", "", step));
  card.append(steps);
  if (alert.kind === "bracketBlocked" && Array.isArray(alert.blocked) && alert.blocked.length) {
    const blocked = alertElement("ul", "alert-blocked");
    for (const label of alert.blocked) blocked.append(alertElement("li", "", label));
    card.append(blocked);
  }
  if (typeof alert.href === "string" && alert.href.startsWith("/") && !alert.href.startsWith("//") && text.button) {
    const actions = alertElement("div", "alert-actions");
    const button = alertElement("button", "btn sm alert-action");
    button.type = "button";
    button.append(alertElement("span", "", text.button));
    const error = alertElement("p", "alert-error");
    error.setAttribute("role", "alert");
    button.onclick = async () => {
      if (button.disabled) return;
      button.disabled = true;
      error.textContent = "";
      try {
        await invoke("open", { what: alert.href });
      } catch {
        error.textContent = "Couldn't open the page. Open the site in your browser.";
      } finally {
        button.disabled = false;
      }
    };
    actions.append(button);
    card.append(actions, error);
  }
  if (alert.detail) {
    const details = alertElement("details", "alert-details");
    details.append(alertElement("summary", "", "Details"), alertElement("pre", "", alert.detail));
    card.append(details);
  }
  return card;
}

function renderAlerts() {
  clearTimeout(alertExpiry);
  const now = Date.now();
  const ids = new Set(latestAlerts.map((alert) => alert.id));
  for (const [id, until] of alertSnoozes) if (!ids.has(id) || until <= now) alertSnoozes.delete(id);
  for (const id of alertCards.keys()) if (!ids.has(id)) alertCards.delete(id);
  const visible = latestAlerts.filter((alert) => !alertSnoozes.has(alert.id)).sort((a, b) => b.since - a.since);
  const stack = $("alerts");
  const cards = (alertsExpanded ? visible : visible.slice(0, 3)).map((alert) => {
    const key = JSON.stringify(alert);
    let cached = alertCards.get(alert.id);
    if (!cached || cached.key !== key) {
      const node = alertCard(alert);
      const previous = cached?.node.querySelector("details");
      if (previous?.open && node.querySelector("details")) node.querySelector("details").open = true;
      cached = { key, node };
      alertCards.set(alert.id, cached);
    }
    return cached.node;
  });
  if (visible.length > 3) {
    const more = alertElement("button", "alert-more", alertsExpanded ? "Show fewer" : `+${visible.length - 3} more`);
    more.type = "button";
    more.setAttribute("aria-expanded", String(alertsExpanded));
    more.onclick = () => {
      alertsExpanded = !alertsExpanded;
      renderAlerts();
    };
    cards.push(more);
  }
  for (const node of [...stack.children]) if (!cards.includes(node)) node.remove();
  cards.forEach((node, index) => {
    if (stack.children[index] !== node) stack.insertBefore(node, stack.children[index] ?? null);
  });
  stack.hidden = !visible.length;
  const nearest = Math.min(...alertSnoozes.values());
  if (Number.isFinite(nearest)) alertExpiry = setTimeout(renderAlerts, Math.max(0, nearest - Date.now()));
}

function receiveAlerts(alerts) {
  if (!Array.isArray(alerts)) return;
  latestAlerts = alerts.filter((alert) => alert && typeof alert.id === "string" && Object.hasOwn(ALERT_TEXT, alert.kind) && (alert.level === "red" || alert.level === "gold"));
  alertRevision++;
  renderAlerts();
}

let screen = null;
let tabPicked = false;
let tab = (() => {
  try {
    return localStorage.getItem("tab");
  } catch {
    return null;
  }
})();
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
  if (!tab) tab = s.can_stream && !s.can_ref ? "stream" : "ref";
  const allowed = { ref: !!s.can_ref, stream: !!s.can_stream };
  const other = tab === "ref" ? "stream" : "ref";
  if (s.roles_ready && !tabPicked && !allowed[tab] && allowed[other]) tab = other;
  for (const b of document.querySelectorAll(".tab")) {
    const on = b.dataset.tab === tab;
    b.classList.toggle("on", on);
    b.setAttribute("aria-selected", String(on));
    b.classList.toggle("nope", !!s.roles_ready && !allowed[b.dataset.tab]);
  }
  $("ref-section").hidden = !s.roles_ready || tab !== "ref" || !s.can_ref;
  $("stream-section").hidden = !s.roles_ready || tab !== "stream" || !s.can_stream;
  const locked = !!s.roles_ready && !allowed[tab];
  $("locked").hidden = !locked;
  if (locked) {
    $("locked-h").textContent = tab === "ref" ? "no referee role" : "no streamer role";
    $("locked-t").textContent = tab === "ref" ? "ask tournament staff to give this account the referee role on the site, then switch here again." : "ask tournament staff to give this account the streamer role on the site, then switch here again.";
  }
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
    $("pass-note").textContent = "irc password saved. osu! irc connects when a lobby opens.";
    setTimeout(() => {
      if ($("pass-note").textContent.startsWith("irc password saved")) $("pass-note").textContent = "";
    }, 8000);
  }
};

$("go").onclick = async () => {
  const btn = $("go");
  if (btn.disabled || unlinkBusy) return;
  $("login-err").textContent = "";
  btn.disabled = true;
  try {
    const word = await invoke("link");
    $("word").textContent = word;
    $("wait-err").textContent = "";
    if (latestStatus?.linked) show("s-run");
    else show("s-wait");
  } catch (e) {
    $("login-err").textContent = errorText(e);
  } finally {
    btn.disabled = false;
  }
};

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
    await listen("alerts", (e) => receiveAlerts(e.payload));
    const revision = alertRevision;
    const alerts = await invoke("alerts");
    if (revision === alertRevision) receiveAlerts(alerts);
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
    for (const e of await invoke("logs")) addLog(e, false);
    render(await invoke("status"));
    await syncAuto();
  } catch (e) {
    $(screen === "s-run" ? "run-err" : "login-err").textContent = errorText(e);
  }
})();

for (const b of document.querySelectorAll(".tab")) {
  b.addEventListener("click", () => {
    tab = b.dataset.tab;
    tabPicked = true;
    try {
      localStorage.setItem("tab", tab);
    } catch {}
    if (latestStatus) render(latestStatus);
    invoke("recheck_roles").catch(() => {});
  });
}
