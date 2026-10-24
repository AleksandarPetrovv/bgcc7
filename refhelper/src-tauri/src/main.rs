#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod filter;
mod relay;
mod store;
mod streaming;

use base64::Engine;
use rand::RngCore;
use relay::{Entry, Shared, Status};
use sha2::{Digest, Sha256};
use std::sync::{Arc, Mutex};
use std::time::Duration;
use store::{Config, Store};
use tauri::menu::{Menu, MenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{AppHandle, Emitter, Manager, State, WindowEvent};
use tauri_plugin_autostart::ManagerExt;
use tauri_plugin_opener::OpenerExt;
use tokio::sync::watch;

pub const SITE: &str = env!("BGCC_SITE");
const IRC_PAGE: &str = "https://osu.ppy.sh/home/account/edit#legacy-api";
const ALPHA: &[u8] = b"ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

struct Ctl {
    shared: Arc<Shared>,
    relay: Mutex<Option<watch::Sender<bool>>>,
    linking: Mutex<Option<watch::Sender<bool>>>,
    streaming: Mutex<Option<watch::Sender<bool>>>,
    auth: Mutex<Option<watch::Sender<bool>>>,
}

fn link_word(state: &str) -> String {
    Sha256::digest(state.as_bytes())[..4].iter().map(|b| ALPHA[(*b % 32) as usize] as char).collect()
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
        s.site = if s.linked && s.roles_ready { "online" } else { "off" };
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
    sh.set(|s| {
        s.linked = false;
        s.roles_ready = false;
        s.can_ref = false;
        s.can_stream = false;
        s.site = "off";
        s.irc = "idle";
        s.lobbies.clear();
        s.stream_state = "unpaired".into();
        s.stream_match = None;
        s.stream_clients = 0;
    });
    sh.note("warn", "the site unlinked this app, link it again");
}

#[derive(serde::Deserialize)]
struct Roles {
    id: u64,
    name: String,
    #[serde(rename = "ref")]
    can_ref: bool,
    #[serde(rename = "stream")]
    can_stream: bool,
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
        let http = reqwest::Client::builder().timeout(Duration::from_secs(15)).build().expect("http client");
        loop {
            let result = tokio::select! {
                result = async {
                    let r = http.get(format!("{SITE}/api/relay/me")).bearer_auth(&token).send().await.map_err(|_| 0u16)?;
                    if !r.status().is_success() { return Err(r.status().as_u16()); }
                    r.json::<Roles>().await.map_err(|_| 0u16)
                } => result,
                _ = stop.changed() => return,
            };
            if *stop.borrow() || sh.store.load().token.as_deref() != Some(token.as_str()) { return; }
            match result {
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
                    return;
                }
                Err(401) => { invalidate(&sh, &token); return; }
                Err(403) => {
                    sh.set(|s| { s.roles_ready = true; s.site = "off"; s.stream_state = "forbidden".into(); });
                    sh.note("warn", "this account has no helper roles");
                    return;
                }
                _ => sh.set(|s| { s.site = "off"; s.stream_state = if s.streaming { "error" } else { "off" }.into(); }),
            }
            tokio::select! {
                _ = tokio::time::sleep(Duration::from_secs(5)) => {},
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
fn status(ctl: State<'_, Ctl>) -> Status {
    ctl.shared.status()
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
async fn link(app: AppHandle, ctl: State<'_, Ctl>, name: String, pass: String) -> Result<String, String> {
    let name = name.trim().replace(' ', "_");
    let pass = pass.trim().to_string();
    if name.is_empty() || name.chars().any(|c| c.is_whitespace() || c.is_control()) {
        return Err("empty".into());
    }
    if !pass.is_empty() {
        relay::check_irc(&name, &pass).await?;
        ctl.shared.store.set_password(&name, &pass).map_err(|_| "keyring".to_string())?;
    }
    cancel_link(app.state::<Ctl>());
    stop_auth(&ctl);
    stop_relay(&ctl);
    stop_streaming(&ctl);
    ctl.shared.set(|s| {
        s.linked = false; s.roles_ready = false; s.can_ref = false; s.can_stream = false;
        s.site = "off"; s.irc = "idle"; s.lobbies.clear();
        s.stream_state = "unpaired".into(); s.stream_match = None; s.stream_clients = 0;
    });
    ctl.shared.store.save(&Config { name: name.clone(), id: 0, token: None });

    let mut raw = [0u8; 32];
    rand::thread_rng().fill_bytes(&mut raw);
    let state = base64::engine::general_purpose::URL_SAFE_NO_PAD.encode(raw);
    let word = link_word(&state);
    let _ = app.opener().open_url(format!("{SITE}/admin/refapp?link={state}"), None::<&str>);

    let (tx, mut rx) = watch::channel(false);
    if let Some(old) = ctl.linking.lock().unwrap().replace(tx) {
        let _ = old.send(true);
    }
    let app2 = app.clone();
    tauri::async_runtime::spawn(async move {
        let http = reqwest::Client::builder().timeout(Duration::from_secs(15)).build().expect("http client");
        for _ in 0..200 {
            tokio::select! {
                _ = tokio::time::sleep(Duration::from_secs(3)) => {}
                _ = rx.changed() => return,
            }
            let response = tokio::select! {
                result = http.post(format!("{SITE}/api/relay/claim")).json(&serde_json::json!({ "state": state, "irc": name })).send() => result,
                _ = rx.changed() => return,
            };
            let Ok(r) = response else { continue };
            match r.status().as_u16() {
                200 => {
                    let body = tokio::select! {
                        body = r.json::<serde_json::Value>() => body,
                        _ = rx.changed() => return,
                    };
                    let Ok(v) = body else { continue };
                    let Some(token) = v["token"].as_str() else { continue };
                    if *rx.borrow() { return; }
                    let ctl = app2.state::<Ctl>();
                    ctl.shared.store.save(&Config { name: name.clone(), id: 0, token: Some(token.to_string()) });
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
    ctl.shared.set(|s| {
        s.linked = false; s.sent = 0; s.roles_ready = false; s.can_ref = false; s.can_stream = false;
        s.site = "off"; s.irc = "idle"; s.lobbies.clear();
        s.stream_state = "unpaired".into(); s.stream_match = None; s.stream_clients = 0;
    });
    if let Some(token) = &c.token {
        let _ = reqwest::Client::new().delete(format!("{SITE}/api/relay/stream")).bearer_auth(token).send().await;
    }
    Ok(())
}

#[tauri::command]
async fn uninstall(app: AppHandle, ctl: State<'_, Ctl>) -> Result<(), String> {
    unlink(ctl).await?;
    let _ = app.autolaunch().disable();
    let p = app.path();
    let mut dirs: Vec<std::path::PathBuf> = [p.app_config_dir(), p.app_data_dir(), p.app_local_data_dir(), p.app_cache_dir(), p.app_log_dir()].into_iter().flatten().collect();
    dirs.sort();
    dirs.dedup();
    let id = app.config().identifier.clone();
    let mut script = String::from("ping 127.0.0.1 -n 3 > nul");
    for d in dirs.iter().filter(|d| d.components().any(|c| c.as_os_str() == id.as_str())) {
        script.push_str(&format!(" & rmdir /s /q \"{}\"", d.display()));
    }
    if let Ok(exe) = std::env::current_exe() {
        script.push_str(&format!(" & del /f /q \"{}\"", exe.display()));
    }
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        let _ = std::process::Command::new("cmd").raw_arg(format!("/C {script}")).creation_flags(0x0800_0000).spawn();
    }
    app.exit(0);
    Ok(())
}

#[tauri::command]
fn open(app: AppHandle, ctl: State<'_, Ctl>, what: String) {
    let url = match what.as_str() {
        "irc" => IRC_PAGE.to_string(),
        "page" if ctl.shared.status().can_stream && !ctl.shared.status().can_ref => format!("{SITE}/admin/overlay"),
        "page" => format!("{SITE}/admin/refapp"),
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

            let open_i = MenuItem::with_id(app, "open", "open", true, None::<&str>)?;
            let quit_i = MenuItem::with_id(app, "quit", "quit", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&open_i, &quit_i])?;
            let mut tray = TrayIconBuilder::with_id("main").tooltip("BGCC7 Ref Helper").menu(&menu).show_menu_on_left_click(false);
            if let Some(icon) = app.default_window_icon() {
                tray = tray.icon(icon.clone());
            }
            tray.on_menu_event(|app, e| match e.id.as_ref() {
                "open" => show(app),
                "quit" => app.exit(0),
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
            WindowEvent::CloseRequested { .. } => w.app_handle().exit(0),
            WindowEvent::Resized(_) => {
                if w.is_minimized().unwrap_or(false) {
                    let _ = w.hide();
                }
            }
            _ => {}
        })
        .invoke_handler(tauri::generate_handler![status, logs, saved_name, link, cancel_link, unlink, uninstall, open, autostart, set_streaming, save_irc_password])
        .run(tauri::generate_context!())
        .expect("error while running BGCC7 Ref Helper");
}
