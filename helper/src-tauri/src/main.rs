#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

#[cfg(test)]
mod contract;
mod filter;
mod relay;
mod store;
mod streaming;

use base64::Engine;
use rand::RngCore;
use relay::{http, Entry, Shared, Status};
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};
use store::{Config, Store};
use tauri::menu::{Menu, MenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{AppHandle, Emitter, Manager, State, WindowEvent};
use tauri_plugin_autostart::ManagerExt;
use tauri_plugin_opener::OpenerExt;
use tokio::sync::watch;

pub const SITE: &str = env!("BGCC_SITE");
const IRC_PAGE: &str = "https://osu.ppy.sh/home/account/edit#legacy-api";
// these mirror src/lib/relay-contract.ts; `cargo test` checks them against helper/contract/fixture.json
const STATE_BYTES: usize = 32;
const CLAIM_POLL: Duration = Duration::from_secs(3);
const CLAIM_POLLS: u32 = 200;
const ME_POLL: Duration = Duration::from_secs(20);
const ME_RETRY: Duration = Duration::from_secs(5);
const ME_TIMEOUT: Duration = Duration::from_secs(15);
const LINK_TIMEOUT: Duration = Duration::from_secs(15);
const UNLINK_TIMEOUT: Duration = Duration::from_secs(10);
const BYE_TIMEOUT: Duration = Duration::from_secs(2);
const SITE_DOWN_AFTER: Duration = Duration::from_secs(60);

struct Ctl {
    shared: Arc<Shared>,
    relay: Mutex<Option<watch::Sender<bool>>>,
    linking: Mutex<Option<watch::Sender<bool>>>,
    streaming: Mutex<Option<watch::Sender<bool>>>,
    auth: Mutex<Option<watch::Sender<bool>>>,
}

fn start_relay(ctl: &Ctl) {
    if !ctl.shared.status().can_ref { return; }
    let c = ctl.shared.store.load();
    let Some(token) = c.token.clone() else { return };
    let Some(pass) = ctl.shared.store.password(&c.name) else {
        ctl.shared.set(|s| s.irc = "badpass");
        ctl.shared.note("warn", "save your irc password to enable ref mode");
        return;
    };
    let (tx, rx) = watch::channel(false);
    if let Some(old) = ctl.relay.lock().unwrap().replace(tx) {
        let _ = old.send(true);
    }
    ctl.shared.set(|s| {
        s.linked = true;
        s.name = c.name.clone();
        s.id = c.id;
    });
    tauri::async_runtime::spawn(relay::run(ctl.shared.clone(), token, c.name, pass, rx));
}

fn stop_relay(ctl: &Ctl) {
    if let Some(old) = ctl.relay.lock().unwrap().take() {
        let _ = old.send(true);
    }
    ctl.shared.set(|s| {
        s.site = s.idle_site();
        s.irc = "idle";
        s.lobbies.clear();
    });
}

fn stop_streaming(ctl: &Ctl) {
    if let Some(old) = ctl.streaming.lock().unwrap().take() { let _ = old.send(true); }
}

fn stop_auth(ctl: &Ctl) {
    if let Some(old) = ctl.auth.lock().unwrap().take() { let _ = old.send(true); }
}

fn start_streaming(ctl: &Ctl) {
    let s = ctl.shared.status();
    if !s.linked || !s.roles_ready || !s.can_stream || !s.streaming { return; }
    let Some(token) = ctl.shared.store.load().token else { return };
    let (tx, rx) = watch::channel(false);
    if let Some(old) = ctl.streaming.lock().unwrap().replace(tx) { let _ = old.send(true); }
    ctl.shared.set(|s| { s.stream_state = "waiting".into(); s.stream_match = None; s.stream_clients = 0; });
    tauri::async_runtime::spawn(streaming::run(ctl.shared.clone(), token, rx));
}

pub(crate) fn invalidate(sh: &Shared, token: &str) {
    let ctl = sh.app.state::<Ctl>();
    let mut c = sh.store.load();
    if c.token.as_deref() != Some(token) { return; }
    stop_auth(&ctl);
    stop_relay(&ctl);
    stop_streaming(&ctl);
    c.token = None;
    sh.store.save(&c);
    sh.clear_alerts();
    sh.set(Status::unpair);
    sh.note("warn", "the site unlinked this app, link it again");
}

/// GET /api/relay/me
#[derive(serde::Deserialize)]
struct Roles {
    id: u64,
    name: String,
    #[serde(rename = "ref")]
    can_ref: bool,
    #[serde(rename = "stream")]
    can_stream: bool,
    #[serde(default)]
    alerts: Vec<serde_json::Value>,
}

/// POST /api/relay/start
#[derive(serde::Deserialize)]
struct Started {
    code: String,
}

/// POST /api/relay/claim, once the code was typed on the site
#[derive(serde::Deserialize)]
struct Claimed {
    token: String,
    name: String,
}

fn apply_roles(ctl: &Ctl, before: &Status, roles: &Roles) {
    if roles.can_ref && !before.can_ref { start_relay(ctl); }
    if !roles.can_ref && before.can_ref { stop_relay(ctl); }
    if roles.can_stream && !before.can_stream { start_streaming(ctl); }
    if !roles.can_stream && before.can_stream { stop_streaming(ctl); }
}

enum MeErr { Status(u16), Net, Decode }

async fn fetch_me(token: &str) -> Result<Roles, MeErr> {
    let r = http().get(format!("{SITE}/api/relay/me")).bearer_auth(token).timeout(ME_TIMEOUT).send().await.map_err(|_| MeErr::Net)?;
    if !r.status().is_success() { return Err(MeErr::Status(r.status().as_u16())); }
    r.json::<Roles>().await.map_err(|e| if e.is_decode() { MeErr::Decode } else { MeErr::Net })
}

/// false when the poll should stop (token gone or rejected)
fn apply_me(sh: &Shared, token: &str, result: Result<Roles, MeErr>, failed_since: &mut Option<(Instant, u64)>) -> bool {
    if sh.store.load().token.as_deref() != Some(token) { return false; }
    match &result {
        Ok(roles) => {
            *failed_since = None;
            sh.server_alerts(roles.alerts.clone(), true);
        }
        Err(MeErr::Net | MeErr::Status(500..=599)) => {
            let (start, since) = failed_since.get_or_insert_with(|| {
                let since = SystemTime::now().duration_since(UNIX_EPOCH).map(|d| d.as_millis() as u64).unwrap_or(0);
                (Instant::now(), since)
            });
            if start.elapsed() >= SITE_DOWN_AFTER {
                sh.site_down(Some(*since));
            }
        }
        Err(MeErr::Decode) => {
            *failed_since = None;
            sh.site_down(None);
        }
        _ => *failed_since = None,
    }
    match result {
        Ok(roles) if sh.status().roles_ready => {
            let before = sh.status();
            sh.set(|s| { s.can_ref = roles.can_ref; s.can_stream = roles.can_stream; s.site = "online"; });
            apply_roles(&sh.app.state::<Ctl>(), &before, &roles);
        }
        Ok(roles) => {
            let mut c = sh.store.load();
            c.id = roles.id;
            c.name = roles.name;
            sh.store.save(&c);
            sh.set(|s| {
                s.name = c.name;
                s.id = c.id;
                s.can_ref = roles.can_ref;
                s.can_stream = roles.can_stream;
                s.roles_ready = true;
                s.site = "online";
                s.stream_state = if !s.streaming { "off" } else if roles.can_stream { "waiting" } else { "forbidden" }.into();
            });
            let ctl = sh.app.state::<Ctl>();
            start_relay(&ctl);
            start_streaming(&ctl);
        }
        Err(MeErr::Status(401)) => { invalidate(sh, token); return false; }
        _ => sh.set(|s| { s.site = "off"; s.stream_state = if s.streaming { "error" } else { "off" }.into(); }),
    }
    true
}

fn refresh_roles(ctl: &Ctl) {
    stop_auth(ctl);
    stop_relay(ctl);
    stop_streaming(ctl);
    let c = ctl.shared.store.load();
    let Some(token) = c.token else { return };
    ctl.shared.set(|s| {
        s.linked = true;
        s.name = c.name;
        s.id = c.id;
        s.roles_ready = false;
        s.can_ref = false;
        s.can_stream = false;
        s.site = "connecting";
        s.stream_state = if s.streaming { "waiting" } else { "off" }.into();
        s.stream_match = None;
        s.stream_clients = 0;
    });
    let (tx, mut stop) = watch::channel(false);
    *ctl.auth.lock().unwrap() = Some(tx);
    let sh = ctl.shared.clone();
    tauri::async_runtime::spawn(async move {
        let mut failed_since = None;
        loop {
            let result = tokio::select! {
                result = fetch_me(&token) => result,
                _ = stop.changed() => return,
            };
            if *stop.borrow() || !apply_me(&sh, &token, result, &mut failed_since) { return; }
            tokio::select! {
                // keeps the site page showing the app as running, also for streamers without irc
                _ = tokio::time::sleep(if sh.status().roles_ready { ME_POLL } else { ME_RETRY }) => {},
                _ = stop.changed() => return,
            }
        }
    });
}

#[tauri::command]
fn set_streaming(ctl: State<'_, Ctl>, on: bool) -> Result<(), String> {
    stop_streaming(&ctl);
    ctl.shared.set(|s| {
        s.streaming = on;
        s.stream_match = None;
        s.stream_clients = 0;
        s.stream_state = if !on { "off" } else if !s.linked { "unpaired" } else if !s.roles_ready { "waiting" } else if !s.can_stream { "forbidden" } else { "waiting" }.into();
    });
    if on { start_streaming(&ctl); }
    Ok(())
}

#[tauri::command]
async fn save_irc_password(ctl: State<'_, Ctl>, pass: String) -> Result<(), String> {
    let c = ctl.shared.store.load();
    if c.token.is_none() { return Err("unpaired".into()); }
    let pass = pass.trim();
    if pass.is_empty() { return Err("empty".into()); }
    relay::check_irc(&c.name, pass).await?;
    if ctl.shared.store.load().token != c.token { return Err("unpaired".into()); }
    ctl.shared.store.set_password(&c.name, pass).map_err(|_| "keyring".to_string())?;
    stop_relay(&ctl);
    start_relay(&ctl);
    Ok(())
}

#[tauri::command]
async fn recheck_roles(ctl: State<'_, Ctl>) -> Result<(), String> {
    let Some(token) = ctl.shared.store.load().token else { return Ok(()) };
    let result = fetch_me(&token).await;
    apply_me(&ctl.shared, &token, result, &mut None);
    Ok(())
}

#[tauri::command]
fn status(ctl: State<'_, Ctl>) -> Status {
    ctl.shared.status()
}

#[tauri::command]
fn alerts(ctl: State<'_, Ctl>) -> Vec<serde_json::Value> {
    ctl.shared.alerts()
}

#[tauri::command]
fn logs(ctl: State<'_, Ctl>) -> Vec<Entry> {
    ctl.shared.logs()
}

#[tauri::command]
fn saved_name(ctl: State<'_, Ctl>) -> String {
    ctl.shared.store.load().name
}

#[tauri::command]
async fn link(app: AppHandle, ctl: State<'_, Ctl>) -> Result<String, String> {
    cancel_link(app.state::<Ctl>());
    stop_auth(&ctl);
    stop_relay(&ctl);
    stop_streaming(&ctl);
    ctl.shared.set(Status::unpair);
    let old = ctl.shared.store.load().name;
    ctl.shared.store.save(&Config { name: old, id: 0, token: None });

    let mut raw = [0u8; STATE_BYTES];
    rand::thread_rng().fill_bytes(&mut raw);
    let state = base64::engine::general_purpose::URL_SAFE_NO_PAD.encode(raw);
    // the site hands out a short code to type on /admin/helper; the state itself never goes into a url
    let start = http().post(format!("{SITE}/api/relay/start")).json(&serde_json::json!({ "state": state })).timeout(LINK_TIMEOUT).send().await
        .map_err(|_| "nosite".to_string())?;
    if !start.status().is_success() { return Err("nosite".into()); }
    let word = start.json::<Started>().await.map_err(|_| "nosite".to_string())?.code;
    let _ = app.opener().open_url(format!("{SITE}/admin/helper"), None::<&str>);

    let (tx, mut rx) = watch::channel(false);
    if let Some(old) = ctl.linking.lock().unwrap().replace(tx) {
        let _ = old.send(true);
    }
    let app2 = app.clone();
    tauri::async_runtime::spawn(async move {
        for _ in 0..CLAIM_POLLS {
            tokio::select! {
                _ = tokio::time::sleep(CLAIM_POLL) => {}
                _ = rx.changed() => return,
            }
            let response = tokio::select! {
                result = http().post(format!("{SITE}/api/relay/claim")).json(&serde_json::json!({ "state": state })).timeout(LINK_TIMEOUT).send() => result,
                _ = rx.changed() => return,
            };
            let Ok(r) = response else { continue };
            match r.status().as_u16() {
                200 => {
                    let body = tokio::select! {
                        body = r.json::<Claimed>() => body,
                        _ = rx.changed() => return,
                    };
                    let Ok(Claimed { token, name }) = body else { continue };
                    if *rx.borrow() { return; }
                    let ctl = app2.state::<Ctl>();
                    ctl.shared.store.save(&Config { name, id: 0, token: Some(token) });
                    refresh_roles(&ctl);
                    ctl.shared.note("ok", "linked to the site");
                    let _ = app2.emit("linked", ());
                    return;
                }
                403 => {
                    let _ = app2.emit("link_error", "wrongname");
                    return;
                }
                _ => {}
            }
        }
        let _ = app2.emit("link_error", "timeout");
    });
    Ok(word)
}

#[tauri::command]
fn cancel_link(ctl: State<'_, Ctl>) {
    if let Some(old) = ctl.linking.lock().unwrap().take() {
        let _ = old.send(true);
    }
}

#[tauri::command]
async fn unlink(ctl: State<'_, Ctl>) -> Result<(), String> {
    if let Some(old) = ctl.linking.lock().unwrap().take() { let _ = old.send(true); }
    stop_auth(&ctl);
    stop_relay(&ctl);
    stop_streaming(&ctl);
    let c = ctl.shared.store.load();
    ctl.shared.store.forget(&c.name);
    ctl.shared.clear_alerts();
    ctl.shared.set(|s| { s.unpair(); s.sent = 0; });
    if let Some(token) = &c.token {
        let _ = http().delete(format!("{SITE}/api/relay/stream")).bearer_auth(token).timeout(UNLINK_TIMEOUT).send().await;
    }
    Ok(())
}

#[tauri::command]
fn open(app: AppHandle, what: String) {
    let url = match what.as_str() {
        path if path.starts_with('/') && !path.starts_with("//") && !path.contains('\\') && !path.chars().any(char::is_control) => format!("{}{path}", SITE.trim_end_matches('/')),
        "irc" => IRC_PAGE.to_string(),
        "page" => format!("{SITE}/admin/helper"),
        _ => SITE.to_string(),
    };
    let _ = app.opener().open_url(url, None::<&str>);
}

#[tauri::command]
fn autostart(app: AppHandle, on: Option<bool>) -> bool {
    let a = app.autolaunch();
    match on {
        Some(true) => {
            let _ = a.enable();
        }
        Some(false) => {
            let _ = a.disable();
        }
        None => {}
    }
    a.is_enabled().unwrap_or(false)
}

fn show(app: &AppHandle) {
    if let Some(w) = app.get_webview_window("main") {
        let _ = w.show();
        let _ = w.unminimize();
        let _ = w.set_focus();
    }
}

// tells the site the app is closing so its helper page flips to "not running" at once
fn quit(app: &AppHandle) {
    if let Some(token) = app.state::<Ctl>().shared.store.load().token {
        tauri::async_runtime::block_on(async move {
            let _ = http().post(format!("{SITE}/api/relay/bye")).bearer_auth(token).timeout(BYE_TIMEOUT).send().await;
        });
    }
    app.exit(0);
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _, _| show(app)))
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_autostart::init(tauri_plugin_autostart::MacosLauncher::LaunchAgent, Some(vec!["--hidden"])))
        .setup(|app| {
            let dir = app.path().app_config_dir()?;
            let shared = Arc::new(Shared::new(app.handle().clone(), Store::new(dir)));
            app.manage(Ctl { shared, relay: Mutex::new(None), linking: Mutex::new(None), streaming: Mutex::new(None), auth: Mutex::new(None) });
            refresh_roles(&app.state::<Ctl>());

            let open_i = MenuItem::with_id(app, "open", "Open", true, None::<&str>)?;
            let quit_i = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&open_i, &quit_i])?;
            let mut tray = TrayIconBuilder::with_id("main").tooltip("BGCC7 Helper").menu(&menu).show_menu_on_left_click(false);
            if let Some(icon) = app.default_window_icon() {
                tray = tray.icon(icon.clone());
            }
            tray.on_menu_event(|app, e| match e.id.as_ref() {
                "open" => show(app),
                "quit" => quit(app),
                _ => {}
            })
            .on_tray_icon_event(|t, e| {
                if let TrayIconEvent::Click { button: MouseButton::Left, button_state: MouseButtonState::Up, .. } = e {
                    show(t.app_handle());
                }
            })
            .build(app)?;

            if !std::env::args().any(|a| a == "--hidden") {
                show(app.handle());
            }
            Ok(())
        })
        .on_window_event(|w, e| match e {
            WindowEvent::CloseRequested { .. } => quit(w.app_handle()),
            WindowEvent::Resized(_) => {
                if w.is_minimized().unwrap_or(false) {
                    let _ = w.hide();
                }
            }
            _ => {}
        })
        .invoke_handler(tauri::generate_handler![status, alerts, logs, saved_name, link, cancel_link, unlink, open, autostart, set_streaming, save_irc_password, recheck_roles])
        .run(tauri::generate_context!())
        .expect("error while running BGCC7 Helper");
}
