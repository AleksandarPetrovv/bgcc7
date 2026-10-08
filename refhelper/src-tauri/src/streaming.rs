use crate::{relay::Shared, SITE};
use rtosu_dataprovider::{v2::TosuV2Packet, OsuReader};
use serde::Serialize;
use std::sync::{atomic::{AtomicBool, Ordering}, Arc};
use std::time::{Duration, Instant};
use tokio::sync::watch;

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct ScorePacket {
    ipc_state: i32,
    map_id: i32,
    clients: Vec<LiveClient>,
}

#[derive(Clone, Serialize)]
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

fn packet(source: &TosuV2Packet) -> ScorePacket {
    let clients = source.tourney.clients.iter()
        .filter(|c| c.team == "left" || c.team == "right")
        .take(16)
        .map(|c| {
            let mut units = 0;
            let name = c.user.name.chars().take_while(|ch| {
                units += ch.len_utf16();
                units <= 32
            }).collect();
            let mods = c.play.mods.array.iter()
                .map(|m| m.acronym.to_ascii_uppercase())
                .filter(|m| m.len() == 2 && m.bytes().all(|b| b.is_ascii_uppercase() || b.is_ascii_digit()))
                .take(16).collect();
            LiveClient {
                ipc_id: (c.ipc_id as u64).min(9_007_199_254_740_991),
                team: c.team.clone(),
                user_id: c.user.id.max(0),
                name,
                score: c.play.score.max(0),
                accuracy: if c.play.accuracy.is_finite() { c.play.accuracy.clamp(0.0, 100.0) } else { 0.0 },
                combo: c.play.combo.current.max(0),
                max_combo: c.play.combo.max.max(0),
                mods,
                failed: c.play.failed,
            }
        }).collect();
    ScorePacket {
        ipc_state: source.tourney.ipc_state.clamp(0, 10),
        map_id: source.beatmap.id.max(0),
        clients,
    }
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
    let http = match reqwest::Client::builder().user_agent("bgcc-ref/1.0").timeout(Duration::from_secs(5)).build() {
        Ok(http) => http,
        Err(_) => { state(&sh, "error", 0, None); return; }
    };
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
        let count = p.clients.len();
        if last_count != Some(count) && diagnostic.elapsed() >= Duration::from_secs(15) {
            sh.note("info", format!("tourney clients: {count}"));
            last_count = Some(count);
            diagnostic = Instant::now();
        }
        let result = tokio::select! {
            result = async {
                let response = http.post(format!("{SITE}/api/relay/score")).bearer_auth(&token).json(&p).send().await?;
                let code = response.status().as_u16();
                let matched = if code == 200 {
                    response.json::<serde_json::Value>().await?.get("match").and_then(|m| m.as_str()).map(str::to_owned)
                } else { None };
                Ok::<_, reqwest::Error>((code, matched))
            } => result,
            _ = stop.changed() => break,
        };
        if *stop.borrow() { break; }
        match result {
            Ok((200, Some(matched))) => state(&sh, "sending", count, Some(matched)),
            Ok((409, _)) => state(&sh, "nomatch", count, None),
            Ok((401, _)) => { crate::invalidate(&sh, &token); break; }
            Ok((403, _)) => {
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
