#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod filter;
mod relay;
mod store;

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
}

fn link_word(state: &str) -> String {
    Sha256::digest(state.as_bytes())[..4].iter().map(|b| ALPHA[(*b % 32) as usize] as char).collect()
}

fn start_relay(ctl: &Ctl) {
    let c = ctl.shared.store.load();
    let (Some(token), Some(pass)) = (c.token.clone(), ctl.shared.store.password(&c.name)) else { return };
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
    if name.is_empty() || pass.is_empty() {
        return Err("empty".into());
    }
    relay::check_irc(&name, &pass).await?;
    ctl.shared.store.set_password(&name, &pass).map_err(|_| "keyring".to_string())?;
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
        let http = reqwest::Client::new();
        for _ in 0..200 {
            tokio::select! {
                _ = tokio::time::sleep(Duration::from_secs(3)) => {}
                _ = rx.changed() => return,
            }
            let Ok(r) = http.post(format!("{SITE}/api/relay/claim")).json(&serde_json::json!({ "state": state, "irc": name })).send().await else { continue };
            match r.status().as_u16() {
                200 => {
                    let Ok(v) = r.json::<serde_json::Value>().await else { continue };
                    let Some(token) = v["token"].as_str() else { continue };
                    let ctl = app2.state::<Ctl>();
                    ctl.shared.store.save(&Config { name: name.clone(), id: 0, token: Some(token.to_string()) });
                    start_relay(&ctl);
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
    stop_relay(&ctl);
    let c = ctl.shared.store.load();
    if let Some(token) = &c.token {
        let _ = reqwest::Client::new().delete(format!("{SITE}/api/relay/stream")).bearer_auth(token).send().await;
    }
    ctl.shared.store.forget(&c.name);
    ctl.shared.set(|s| {
        s.linked = false;
        s.sent = 0;
    });
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
fn open(app: AppHandle, what: String) {
    let url = match what.as_str() {
        "irc" => IRC_PAGE.to_string(),
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
            app.manage(Ctl { shared, relay: Mutex::new(None), linking: Mutex::new(None) });
            start_relay(&app.state::<Ctl>());

            let open_i = MenuItem::with_id(app, "open", "Open", true, None::<&str>)?;
            let quit_i = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
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
        .on_window_event(|w, e| {
            if let WindowEvent::CloseRequested { api, .. } = e {
                api.prevent_close();
                let _ = w.hide();
            }
        })
        .invoke_handler(tauri::generate_handler![status, logs, saved_name, link, cancel_link, unlink, uninstall, open, autostart])
        .run(tauri::generate_context!())
        .expect("error while running BGCC7 Ref Helper");
}
