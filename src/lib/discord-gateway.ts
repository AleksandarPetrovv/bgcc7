// keeps the bot "online" in discord: a gateway connection with no intents, only presence + heartbeats
const URL = "wss://gateway.discord.gg/?v=10&encoding=json";
const PRESENCE = { since: null, afk: false, status: "online", activities: [
    { name: "Custom Status", type: 4, state: "osu!" },
    { name: "BGCC7 at https://bgcc7.com", type: 0 },
  ],
};

export function startGateway(token: string) {
  let beat: ReturnType<typeof setInterval> | undefined;
  let seq: number | null = null;
  const connect = () => {
    const ws = new WebSocket(URL);
    const send = (op: number, d: unknown) => ws.readyState === WebSocket.OPEN && ws.send(JSON.stringify({ op, d }));
    ws.onmessage = (ev) => {
      const m = JSON.parse(String(ev.data)) as { op: number; s: number | null; d: { heartbeat_interval?: number } };
      if (m.s != null) seq = m.s;
      if (m.op === 10) {
        clearInterval(beat);
        beat = setInterval(() => send(1, seq), m.d.heartbeat_interval);
        send(2, { token, intents: 0, properties: { os: "linux", browser: "bgcc7", device: "bgcc7" }, presence: PRESENCE });
      } else if (m.op === 1) send(1, seq);
      else if (m.op === 7 || m.op === 9) ws.close();
    };
    ws.onclose = (ev) => {
      clearInterval(beat);
      // 4004 = bad token: retrying would only get the token rate limited
      if (ev.code !== 4004) setTimeout(connect, 5000 + Math.random() * 5000);
      else console.error("[discord] gateway: bad token");
    };
    ws.onerror = () => {};
  };
  connect();
}
