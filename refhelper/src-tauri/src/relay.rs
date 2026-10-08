use crate::{filter, store::Store, SITE};
use futures_util::StreamExt;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::collections::VecDeque;
use std::sync::{Arc, Mutex};
use std::time::{Duration, SystemTime, UNIX_EPOCH};
use tauri::{AppHandle, Emitter};
use tokio::io::{AsyncBufReadExt, AsyncWriteExt, BufReader};
use tokio::net::tcp::OwnedWriteHalf;
use tokio::net::TcpStream;
use tokio::sync::{mpsc, watch, Mutex as AsyncMutex};
use tokio::task::JoinHandle;
use tokio::time::{sleep, timeout};

const IRC: &str = "irc.ppy.sh:6667";

#[derive(Clone, Serialize, Default)]
pub struct Status {
    pub linked: bool,
    pub name: String,
    pub id: u64,
    pub site: &'static str,
    pub irc: &'static str,
    pub lobbies: Vec<String>,
    pub sent: u64,
}

#[derive(Clone, Serialize)]
pub struct Entry {
    pub at: u64,
    pub kind: &'static str,
    pub text: String,
}

pub struct Shared {
    pub app: AppHandle,
    pub store: Store,
    status: Mutex<Status>,
    log: Mutex<VecDeque<Entry>>,
}

impl Shared {
    pub fn new(app: AppHandle, store: Store) -> Self {
        let status = Status { site: "off", irc: "idle", ..Default::default() };
        Self { app, store, status: Mutex::new(status), log: Mutex::new(VecDeque::new()) }
    }

    pub fn status(&self) -> Status {
        self.status.lock().unwrap().clone()
    }

    pub fn logs(&self) -> Vec<Entry> {
        self.log.lock().unwrap().iter().cloned().collect()
    }

    pub fn set(&self, f: impl FnOnce(&mut Status)) {
        let s = {
            let mut s = self.status.lock().unwrap();
            f(&mut s);
            s.clone()
        };
        let _ = self.app.emit("status", s);
    }

    pub fn note(&self, kind: &'static str, text: impl Into<String>) {
        let at = SystemTime::now().duration_since(UNIX_EPOCH).map(|d| d.as_millis() as u64).unwrap_or(0);
        let e = Entry { at, kind, text: text.into() };
        {
            let mut l = self.log.lock().unwrap();
            l.push_front(e.clone());
            l.truncate(80);
        }
        let _ = self.app.emit("log", e);
    }
}

pub async fn check_irc(name: &str, pass: &str) -> Result<(), String> {
    let s = timeout(Duration::from_secs(10), TcpStream::connect(IRC)).await.map_err(|_| "noirc")?.map_err(|_| "noirc")?;
    let (r, mut w) = s.into_split();
    w.write_all(format!("PASS {pass}\r\nUSER {name} 0 * :{name}\r\nNICK {name}\r\n").as_bytes()).await.map_err(|_| "noirc")?;
    let mut lines = BufReader::new(r).lines();
    let res = timeout(Duration::from_secs(15), async {
        while let Ok(Some(l)) = lines.next_line().await {
            if l.contains(" 001 ") {
                return Ok(());
            }
            if l.contains(" 464 ") {
                return Err("badpass".to_string());
            }
        }
        Err("noirc".to_string())
    })
    .await
    .unwrap_or(Err("noirc".into()));
    let _ = w.write_all(b"QUIT\r\n").await;
    res
}

#[derive(Deserialize)]
#[serde(tag = "t")]
enum Msg {
    #[serde(rename = "open")]
    Open,
    #[serde(rename = "line")]
    Line { l: String },
    #[serde(rename = "close")]
    Close,
    #[serde(rename = "hello")]
    Hello { id: u64 },
    #[serde(other)]
    Other,
}

struct Irc {
    w: Arc<AsyncMutex<OwnedWriteHalf>>,
    reader: JoinHandle<()>,
}

impl Irc {
    async fn shut(self) {
        self.reader.abort();
        let _ = self.w.lock().await.shutdown().await;
    }
}

pub async fn run(sh: Arc<Shared>, token: String, name: String, pass: String, mut stop: watch::Receiver<bool>) {
    let http = reqwest::Client::builder().user_agent("bgcc-ref/1.0").build().expect("http client");
    let mut wait = 2;
    loop {
        if *stop.borrow() {
            break;
        }
        sh.set(|s| s.site = "connecting");
        let res = tokio::select! {
            r = http.get(format!("{SITE}/api/relay/stream")).bearer_auth(&token).send() => r,
            _ = stop.changed() => break,
        };
        match res {
            Ok(r) if r.status().as_u16() == 401 => {
                let mut c = sh.store.load();
                c.token = None;
                sh.store.save(&c);
                sh.set(|s| {
                    s.linked = false;
                    s.site = "off";
                });
                sh.note("warn", "the site unlinked this app, link it again");
                return;
            }
            Ok(r) if r.status().is_success() => {
                wait = 2;
                session(&sh, &http, &token, &name, &pass, r, &mut stop).await;
            }
            _ => {}
        }
        sh.set(|s| {
            s.site = "off";
            s.irc = "idle";
            s.lobbies.clear();
        });
        if *stop.borrow() {
            break;
        }
        tokio::select! {
            _ = sleep(Duration::from_secs(wait)) => {}
            _ = stop.changed() => break,
        }
        wait = (wait * 2).min(30);
    }
    sh.set(|s| {
        s.site = "off";
        s.irc = "idle";
        s.lobbies.clear();
    });
}

async fn session(sh: &Arc<Shared>, http: &reqwest::Client, token: &str, name: &str, pass: &str, resp: reqwest::Response, stop: &mut watch::Receiver<bool>) {
    sh.set(|s| s.site = "online");
    sh.note("ok", "connected to the site");
    let (tx, rx) = mpsc::unbounded_channel::<Value>();
    let poster = tokio::spawn(post_loop(http.clone(), token.to_string(), rx));
    let mut irc: Option<Irc> = None;
    let mut stream = resp.bytes_stream();
    let mut buf: Vec<u8> = Vec::new();
    'outer: loop {
        let chunk = tokio::select! {
            c = stream.next() => c,
            _ = stop.changed() => None,
        };
        let Some(Ok(bytes)) = chunk else { break };
        buf.extend_from_slice(&bytes);
        while let Some(i) = buf.windows(2).position(|w| w == b"\n\n") {
            let ev: Vec<u8> = buf.drain(..i + 2).collect();
            for line in String::from_utf8_lossy(&ev).lines() {
                let Some(d) = line.strip_prefix("data: ") else { continue };
                match serde_json::from_str::<Msg>(d) {
                    Ok(Msg::Open) => {
                        if let Some(old) = irc.take() {
                            old.shut().await;
                        }
                        irc = open(sh, name, &tx).await;
                    }
                    Ok(Msg::Line { l }) => send(sh, irc.as_ref(), &l, name, pass).await,
                    Ok(Msg::Close) => {
                        if let Some(old) = irc.take() {
                            old.shut().await;
                        }
                        sh.set(|s| {
                            s.irc = "idle";
                            s.lobbies.clear();
                        });
                    }
                    Ok(Msg::Hello { id }) => {
                        sh.set(|s| s.id = id);
                        let mut c = sh.store.load();
                        if c.id != id {
                            c.id = id;
                            sh.store.save(&c);
                        }
                    }
                    Ok(Msg::Other) => {}
                    Err(_) => {
                        if *stop.borrow() {
                            break 'outer;
                        }
                    }
                }
            }
        }
    }
    if let Some(old) = irc.take() {
        old.shut().await;
    }
    poster.abort();
    if !*stop.borrow() {
        sh.note("warn", "lost the site connection, retrying");
    }
}

async fn open(sh: &Arc<Shared>, name: &str, tx: &mpsc::UnboundedSender<Value>) -> Option<Irc> {
    sh.set(|s| s.irc = "connecting");
    let s = match timeout(Duration::from_secs(10), TcpStream::connect(IRC)).await {
        Ok(Ok(s)) => s,
        _ => {
            sh.set(|s| s.irc = "idle");
            sh.note("warn", "couldn't reach osu! irc");
            let _ = tx.send(json!({ "t": "closed", "why": "irc unreachable" }));
            return None;
        }
    };
    let (r, w) = s.into_split();
    let w = Arc::new(AsyncMutex::new(w));
    let reader = tokio::spawn(read_loop(sh.clone(), r, w.clone(), name.to_string(), tx.clone()));
    let _ = tx.send(json!({ "t": "opened" }));
    Some(Irc { w, reader })
}

async fn read_loop(sh: Arc<Shared>, r: tokio::net::tcp::OwnedReadHalf, w: Arc<AsyncMutex<OwnedWriteHalf>>, name: String, tx: mpsc::UnboundedSender<Value>) {
    let mut lines = BufReader::new(r).lines();
    while let Ok(Some(l)) = lines.next_line().await {
        if let Some(rest) = l.strip_prefix("PING") {
            let _ = w.lock().await.write_all(format!("PONG{rest}\r\n").as_bytes()).await;
            continue;
        }
        track(&sh, &l, &name);
        if filter::inbound(&l, &name) {
            let _ = tx.send(json!({ "t": "line", "l": l }));
        }
    }
    let _ = tx.send(json!({ "t": "closed", "why": "irc closed" }));
    sh.set(|s| {
        s.irc = "idle";
        s.lobbies.clear();
    });
}

fn track(sh: &Shared, l: &str, name: &str) {
    let me = format!(":{}!", name).to_ascii_lowercase();
    let low = l.to_ascii_lowercase();
    if l.contains(" 001 ") {
        sh.set(|s| s.irc = "online");
        sh.note("ok", format!("logged into osu! irc as {name}"));
    } else if l.contains(" 464 ") {
        sh.set(|s| s.irc = "badpass");
        sh.note("err", "osu! refused the irc password");
    } else if low.starts_with(&me) {
        let mut p = l.split(' ').skip(1);
        let (cmd, ch) = (p.next().unwrap_or(""), p.next().unwrap_or("").trim_start_matches(':').to_string());
        if !filter::is_mp(&ch) {
            return;
        }
        if cmd == "JOIN" {
            sh.note("ok", format!("in lobby {ch}"));
            sh.set(|s| {
                if !s.lobbies.contains(&ch) {
                    s.lobbies.push(ch.clone());
                }
            });
        } else if cmd == "PART" {
            sh.note("info", format!("left lobby {ch}"));
            sh.set(|s| s.lobbies.retain(|x| x != &ch));
        }
    } else if low.starts_with(":banchobot!") {
        if let Some(i) = l.find("Created the tournament match ") {
            sh.note("ok", format!("made {}", l[i + 29..].split_once(' ').map(|x| x.1).unwrap_or("a lobby")));
        }
    }
}

async fn send(sh: &Shared, irc: Option<&Irc>, line: &str, name: &str, pass: &str) {
    let Some(irc) = irc else { return };
    let Some(out) = filter::outbound(line, name, pass) else {
        sh.note("warn", format!("blocked {}", line.split(' ').next().unwrap_or("?")));
        return;
    };
    if irc.w.lock().await.write_all(format!("{out}\r\n").as_bytes()).await.is_err() {
        return;
    }
    if let Some(msg) = out.strip_prefix("PRIVMSG ").and_then(|r| r.split_once(" :")).map(|x| x.1.to_string()) {
        sh.set(|s| s.sent += 1);
        sh.note("cmd", msg);
    }
}

async fn post_loop(http: reqwest::Client, token: String, mut rx: mpsc::UnboundedReceiver<Value>) {
    while let Some(first) = rx.recv().await {
        let mut ev = vec![first];
        while ev.len() < 300 {
            match rx.try_recv() {
                Ok(e) => ev.push(e),
                Err(_) => break,
            }
        }
        let _ = http.post(format!("{SITE}/api/relay/in")).bearer_auth(&token).json(&json!({ "ev": ev })).send().await;
    }
}
