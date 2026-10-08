# bgcc7 ref helper

a small windows tray app for referees and streamers. link your osu! account once and confirm the link on the site. the helper shows the linked account and its referee and streamer roles after the site supplies them.

## linking and roles

- enter your osu! username to link. the irc password is optional; streamers do not need irc.
- refs can enter their irc password when linking or save it from the referee section afterward, without pairing again. the password field clears on submission.
- only accounts with the referee role see the referee section. it shows the actual irc connection state, open lobbies and commands sent. lobby commands use the ref's own osu! irc connection and ip, and lobby traffic returns to the site.
- only accounts with the streamer role see the streaming section. accounts with both roles see both sections; accounts with neither see a role notice.
- while roles are being fetched, the helper shows a checking message rather than assuming either role.

## streaming

streaming defaults to on in the backend. the toggle follows the reported state and can turn score sending off or on; the ui does not reset it when opened.

the backend uses the rtosu library to read the local osu!tourney client and sends live score packets to the site about every 100 ms when tournament data is available. a separate tosu server is not needed. the ui shows the state supplied by the backend:

- off: score sending is disabled.
- waiting: waiting for the tourney client.
- sending: scores are reaching the site.
- no match assigned: the site has no match assigned to this streamer; the backend keeps trying for an assignment.
- forbidden, unpaired or error: streaming needs attention; follow the status guidance and activity log.

the streaming section also shows the assigned match slug reported by the backend and the detected client count. a blank assignment is shown as a dash; enabling the toggle alone does not mean scores are being sent.

in obs or streamlabs, add your personal site overlay as a 1920×1080 browser source above the osu!tourney window capture. the site follows your assigned match. the helper supplies live scores; it does not capture or broadcast video.

## what it shares

- the irc password stays on your pc in windows credential manager and is never returned in ui status.
- for referees, only lobby traffic reaches the site: `#mp_` channels and banchobot's replies to you. private messages and other channels are dropped in the app.
- the site can only make the ref relay join or leave `#mp_` channels and message those channels or banchobot. anything else is blocked in `src-tauri/src/filter.rs`.
- for streamers, live score packets contain the current map id, tournament state and client data: player names and ids, team sides, scores, accuracy, combo, mods and failed state.

## window and startup

the x button requests window close so the app quits. minimize keeps using the backend's tray behavior. start with windows defaults to off; the ui reads the saved preference and changes it only when clicked. the main content scrolls when the role sections and activity log do not fit.

## build

requires rust with the msvc toolchain, node.js and webview2. the site address is baked in at build time from `PUBLIC_URL`, supplied through the build environment or the hosting configuration next to the repo.

from `refhelper/`:

```
npm install
npm run build
```

the executable is written to `src-tauri/target/release/BGCC7 Ref Helper.exe`. `npm run dev` runs it with live reload of the ui. building and uploading are separate steps.

## validation status

this ui update was made without running tests, builds, servers or browser checks. real 2v2 tourney behavior remains unverified. on the first real session, use the backend's count-only activity diagnostics and the clients detected value to check whether the tourney clients are being read.

## layout

- `ui/` – the window, plain html, css and javascript with bundled fonts
- `src-tauri/src/main.rs` – window, tray, linking and commands
- `src-tauri/src/relay.rs` – site and irc connections
- `src-tauri/src/filter.rs` – what may pass in each direction
- `src-tauri/src/store.rs` – saved username, site token and password
