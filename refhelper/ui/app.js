const { invoke } = window.__TAURI__.core;
const { listen } = window.__TAURI__.event;
const win = window.__TAURI__.window.getCurrentWindow();

const $ = (id) => document.getElementById(id);
const ERR = {
  empty: "Fill in both fields",
  badpass: "Wrong irc username or password",
  noirc: "Couldn't reach osu! irc, check your internet",
  keyring: "Couldn't save the password on this pc",
  wrongname: "That osu! account doesn't match the irc username",
  timeout: "Took too long, try again",
};
const SITE = { off: ["Offline", ""], connecting: ["Connecting", "wait"], online: ["Online", "ok"] };
const IRC = { idle: ["Idle", ""], connecting: ["Connecting", "wait"], online: ["Online", "ok"], badpass: ["Wrong password", "bad"] };

let screen = null;
function show(id) {
  if (screen === id) return;
  const order = ["s-login", "s-wait", "s-run"];
  for (const s of document.querySelectorAll(".screen")) {
    const on = s.id === id;
    s.classList.toggle("on", on);
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
  if (!s.linked) {
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
  $("initial").textContent = (s.name[0] ?? "?").toUpperCase();
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
        : [Object.assign(document.createElement("span"), { className: "muted", textContent: "None open" })]),
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
  const v = await invoke("autostart", { on });
  $("auto").classList.toggle("on", v);
}

$("avatar").onload = () => $("avatar").classList.add("ok");
$("min").onclick = () => win.minimize();
$("close").onclick = () => win.hide();
$("getirc").onclick = () => invoke("open", { what: "irc" });
$("site").onclick = () => invoke("open", { what: "site" });
$("reopen").onclick = () => invoke("open", { what: "page" });
$("auto").onclick = () => syncAuto(!$("auto").classList.contains("on"));

$("go").onclick = async () => {
  const btn = $("go");
  $("login-err").textContent = "";
  btn.disabled = true;
  try {
    const word = await invoke("link", { name: $("name").value, pass: $("pass").value });
    $("word").textContent = word;
    $("wait-err").textContent = "";
    $("pass").value = "";
    show("s-wait");
  } catch (e) {
    $("login-err").textContent = ERR[e] ?? String(e);
  } finally {
    btn.disabled = false;
  }
};
for (const id of ["name", "pass"]) $(id).addEventListener("keydown", (e) => e.key === "Enter" && $("go").click());

for (const b of document.querySelectorAll("[data-uninstall]")) b.onclick = () => ($("modal").hidden = false);
$("un-no").onclick = () => ($("modal").hidden = true);
$("modal").onclick = (e) => e.target === $("modal") && ($("modal").hidden = true);
$("un-yes").onclick = async () => {
  $("un-yes").disabled = true;
  await invoke("uninstall");
};

$("cancel").onclick = async () => {
  await invoke("cancel_link");
  show("s-login");
};

$("unlink").onclick = async () => {
  await invoke("unlink");
  $("log").replaceChildren();
  show("s-login");
};

listen("status", (e) => render(e.payload));
listen("log", (e) => addLog(e.payload));
listen("linked", () => syncAuto());
listen("link_error", (e) => {
  $("wait-err").textContent = ERR[e.payload] ?? String(e.payload);
});

(async () => {
  $("name").value = await invoke("saved_name");
  for (const e of await invoke("logs")) addLog(e, false);
  render(await invoke("status"));
  syncAuto();
})();
