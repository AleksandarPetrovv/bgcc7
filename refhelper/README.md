# BGCC7 Ref Helper

A small Windows tray app that lets a referee run BGCC lobbies from the website through their own osu! account.

The ref logs in once with their osu! IRC username and password, confirms the link on the site, and leaves it running. The site sends lobby commands to the app, the app sends them to osu! from the ref's own IRC connection and IP, and passes the lobby traffic back so the match page fills in live.

## What it shares

- Your IRC password never leaves your PC. It's kept in Windows Credential Manager.
- Only lobby traffic reaches the site: `#mp_` channels and BanchoBot's replies to you. Private messages and other channels are dropped in the app.
- The site can only make the app join or leave `#mp_` channels and message `#mp_` channels or BanchoBot. Anything else is blocked in the app (see `src-tauri/src/filter.rs`).

## Build

Needs Rust (MSVC toolchain), Node.js and WebView2 (already on Windows 10/11). The site address comes from `PUBLIC_URL`, set in the environment or read from `host/.env` next to the repo.

```
npm install
npm run build
```

The exe ends up in `src-tauri/target/release/BGCC7 Ref Helper.exe`. `npm run dev` runs it with live reload of the UI.

## Layout

- `ui/` – the window (plain HTML, CSS and JS, fonts bundled)
- `src-tauri/src/main.rs` – window, tray, login and linking
- `src-tauri/src/relay.rs` – the site connection and the IRC connection
- `src-tauri/src/filter.rs` – what may pass in each direction
- `src-tauri/src/store.rs` – saved username, site token and password
