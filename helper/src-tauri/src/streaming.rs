use crate::{relay::{http, Shared}, SITE};
use rtosu_dataprovider::{v2::TosuV2Packet, OsuReader};
use serde::{Deserialize, Serialize};
use std::sync::{atomic::{AtomicBool, Ordering}, Arc};
use std::time::{Duration, Instant};
use tokio::sync::watch;

// these mirror SCORE_LIMITS, SCORE_KEEPALIVE_MS and LIVE_REJECTS in src/lib/relay-contract.ts
pub(crate) const MAX_CLIENTS: usize = 16;
pub(crate) const NAME_UNITS: usize = 32;
pub(crate) const MAX_MODS: usize = 16;
pub(crate) const IPC_STATE_MAX: i32 = 10;
pub(crate) const ACCURACY_MAX: f64 = 100.0;
pub(crate) const KEEPALIVE: Duration = Duration::from_secs(2);
const SCORE_TIMEOUT: Duration = Duration::from_secs(5);
pub(crate) const LIVE_REJECTS: [&str; 4] = ["noplayers", "players", "swapped", "map"];

/// POST /api/relay/score
#[derive(Clone, PartialEq, Serialize)]
#[cfg_attr(test, derive(Deserialize))]
#[serde(rename_all = "camelCase")]
pub(crate) struct ScorePacket {
    ipc_state: i32,
    map_id: i32,
    clients: Vec<LiveClient>,
}

#[derive(Clone, PartialEq, Serialize)]
#[cfg_attr(test, derive(Deserialize))]
#[serde(rename_all = "camelCase")]
struct LiveClient {
    ipc_id: u64,
    team: String,
    user_id: i32,
    name: String,
    score: i32,
    accuracy: f64,
    combo: i32,
    max_combo: i32,
    mods: Vec<String>,
    failed: bool,
}

pub(crate) fn valid_mod(m: &str) -> bool {
    m.len() == 2 && m.bytes().all(|b| b.is_ascii_uppercase() || b.is_ascii_digit())
}

fn packet(source: &TosuV2Packet) -> ScorePacket {
    let clients = source.tourney.clients.iter()
        .filter(|c| c.team == "left" || c.team == "right")
        .take(MAX_CLIENTS)
        .map(|c| {
            let mut units = 0;
            let name = c.user.name.chars().take_while(|ch| {
                units += ch.len_utf16();
                units <= NAME_UNITS
            }).collect();
            let mods = c.play.mods.array.iter()
                .map(|m| m.acronym.to_ascii_uppercase())
                .filter(|m| valid_mod(m))
                .take(MAX_MODS).collect();
            LiveClient {
                ipc_id: (c.ipc_id as u64).min(9_007_199_254_740_991),
                team: c.team.clone(),
                user_id: c.user.id.max(0),
                name,
                score: c.play.score.max(0),
                accuracy: if c.play.accuracy.is_finite() { c.play.accuracy.clamp(0.0, ACCURACY_MAX) } else { 0.0 },
                combo: c.play.combo.current.max(0),
                max_combo: c.play.combo.max.max(0),
                mods,
                failed: c.play.failed,
            }
        }).collect();
    ScorePacket {
        ipc_state: source.tourney.ipc_state.clamp(0, IPC_STATE_MAX),
        map_id: source.beatmap.id.max(0),
        clients,
    }
}

/// the /score reply: {ok, match} or {error, match?}
#[derive(Deserialize, Default)]
pub(crate) struct ScoreReply {
    #[serde(rename = "match")]
    pub(crate) matched: Option<String>,
    pub(crate) error: Option<String>,
}

#[derive(Clone)]
enum Sample {
    Waiting,
    Packet(ScorePacket),
    Error,
}

struct ReaderStop(Arc<AtomicBool>);

impl Drop for ReaderStop {
    fn drop(&mut self) { self.0.store(true, Ordering::Release); }
}

fn state(sh: &Shared, value: &str, clients: usize, matched: Option<String>) {
    let old = sh.status();
    if old.stream_state != value || old.stream_clients != clients || old.stream_match != matched {
        sh.set(|s| {
            s.stream_state = value.into();
            s.stream_clients = clients;
            s.stream_match = matched;
        });
    }
}

pub async fn run(sh: Arc<Shared>, token: String, mut stop: watch::Receiver<bool>) {
    let (tx, mut latest) = watch::channel(Sample::Waiting);
    let quitting = Arc::new(AtomicBool::new(false));
    let guard = ReaderStop(quitting.clone());
    let reader = tauri::async_runtime::spawn_blocking(move || {
        let mut reader = match OsuReader::builder()
            .poll_interval(Duration::from_millis(100))
            .enable_chat(false).enable_pp(false).enable_hit_errors(false).build() {
            Ok(reader) => reader,
            Err(_) => { let _ = tx.send(Sample::Error); return; }
        };
        while !quitting.load(Ordering::Acquire) {
            let started = Instant::now();
            let sample = match reader.poll() {
                Ok(source) if reader.is_tournament() && reader.is_attached() => Sample::Packet(packet(&source)),
                Ok(_) => Sample::Waiting,
                Err(_) if !reader.is_attached() => Sample::Waiting,
                Err(_) => Sample::Error,
            };
            if quitting.load(Ordering::Acquire) || tx.send(sample).is_err() { break; }
            std::thread::sleep(Duration::from_millis(100).saturating_sub(started.elapsed()));
        }
    });
    let mut last_count = None;
    // the reader polls every 100ms; only send when something changed, plus a keepalive well under the site's 10s expiry
    let mut sent: Option<(ScorePacket, Instant)> = None;
    let mut diagnostic = Instant::now() - Duration::from_secs(30);
    loop {
        if *stop.borrow() { break; }
        let changed = tokio::select! {
            changed = latest.changed() => changed,
            _ = stop.changed() => break,
        };
        if *stop.borrow() { break; }
        if changed.is_err() {
            state(&sh, "error", 0, None);
            break;
        }
        let sample = latest.borrow_and_update().clone();
        let p = match sample {
            Sample::Waiting => { state(&sh, "waiting", 0, None); continue; }
            Sample::Error => { state(&sh, "error", 0, None); continue; }
            Sample::Packet(p) => p,
        };
        if sent.as_ref().is_some_and(|(last, at)| *last == p && at.elapsed() < KEEPALIVE) { continue; }
        let count = p.clients.len();
        if last_count != Some(count) && diagnostic.elapsed() >= Duration::from_secs(15) {
            sh.note("info", format!("tourney clients: {count}"));
            last_count = Some(count);
            diagnostic = Instant::now();
        }
        let result = tokio::select! {
            result = async {
                let response = http().post(format!("{SITE}/api/relay/score")).bearer_auth(&token).json(&p).timeout(SCORE_TIMEOUT).send().await?;
                let code = response.status().as_u16();
                let body = response.json::<ScoreReply>().await.unwrap_or_default();
                Ok::<_, reqwest::Error>((code, body.matched, body.error.unwrap_or_default()))
            } => result,
            _ = stop.changed() => break,
        };
        if *stop.borrow() { break; }
        if result.is_ok() { sent = Some((p.clone(), Instant::now())); }
        match result {
            Ok((200, Some(matched), _)) => state(&sh, "sending", count, Some(matched)),
            Ok((409, matched, why)) => {
                let s = if LIVE_REJECTS.contains(&why.as_str()) { why.as_str() } else { "nomatch" };
                state(&sh, s, count, matched);
            }
            Ok((401, _, _)) => { crate::invalidate(&sh, &token); break; }
            Ok((403, _, _)) => {
                sh.set(|s| {
                    s.can_stream = false;
                    s.streaming = false;
                    s.stream_state = "forbidden".into();
                    s.stream_match = None;
                    s.stream_clients = 0;
                });
                sh.note("warn", "this account has no streaming role");
                break;
            }
            _ => state(&sh, "error", count, None),
        }
    }
    drop(guard);
    let _ = reader.await;
}
