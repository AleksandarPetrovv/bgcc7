"use server";

import { abortLobby, closeLobby, inviteMissing, makeLobby, refreshLobby, sendChat, startLobby } from "@/lib/bancho";
import { guard } from "@/lib/admin-action";

export async function makeMpLobby(matchId: string) {
  return guard("matches", "lobby.make", async (osuId) => ({ matchId, ...(await makeLobby(matchId, osuId)) }));
}

export async function inviteMp(matchId: string) {
  return guard("matches", "lobby.invite", async (osuId) => {
    await inviteMissing(matchId, osuId);
    return { matchId };
  });
}

export async function refreshMp(matchId: string) {
  return guard("matches", "lobby.refresh", async () => {
    await refreshLobby(matchId);
    return { matchId };
  });
}

export async function startMp(matchId: string, secs: number) {
  return guard("matches", "lobby.start", async (osuId) => {
    await startLobby(matchId, osuId, Math.max(0, Math.min(30, Math.round(secs) || 0)));
    return { matchId, secs };
  });
}

export async function abortMp(matchId: string) {
  return guard("matches", "lobby.abort", async (osuId) => {
    await abortLobby(matchId, osuId);
    return { matchId };
  });
}

export async function chatMp(matchId: string, text: string) {
  return guard("matches", "lobby.chat", async (osuId) => {
    const r = await sendChat(matchId, osuId, String(text));
    return r === "ok" ? { matchId, text } : { ok: false, error: r };
  });
}

export async function closeMp(matchId: string) {
  return guard("matches", "lobby.close", async (osuId) => {
    await closeLobby(matchId, osuId);
    return { matchId };
  });
}
