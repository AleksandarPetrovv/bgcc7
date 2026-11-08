// the same fixture scripts/relay-contract.check.mjs checks against src/lib/relay-contract.ts
use crate::relay::{site_down_alert, Ev, Msg, RELAY_IN_BATCH};
use crate::streaming::{ScorePacket, ScoreReply, ACCURACY_MAX, IPC_STATE_MAX, KEEPALIVE, LIVE_REJECTS, MAX_CLIENTS, MAX_MODS, NAME_UNITS, valid_mod};
use crate::{Claimed, Roles, Started, CLAIM_POLL, CLAIM_POLLS, ME_POLL, ME_RETRY, SITE_DOWN_AFTER, STATE_BYTES};
use base64::Engine;
use serde_json::{from_value, to_value, Value};

fn fixture() -> Value {
    serde_json::from_str(include_str!("../../contract/fixture.json")).expect("fixture.json")
}

fn ms(d: std::time::Duration) -> Value {
    Value::from(d.as_millis() as u64)
}

#[test]
fn limits_match_the_site() {
    let f = fixture();
    let l = &f["limits"];
    assert_eq!(l["stateBytes"], STATE_BYTES);
    assert_eq!(base64::engine::general_purpose::URL_SAFE_NO_PAD.encode([0u8; STATE_BYTES]).len(), f["start"]["req"]["state"].as_str().unwrap().len());
    assert_eq!(l["claimPollMs"], ms(CLAIM_POLL));
    assert_eq!(l["claimPolls"], CLAIM_POLLS);
    assert_eq!(l["mePollMs"], ms(ME_POLL));
    assert_eq!(l["meRetryMs"], ms(ME_RETRY));
    assert_eq!(l["siteDownAfterMs"], ms(SITE_DOWN_AFTER));
    assert_eq!(l["relayInBatch"], RELAY_IN_BATCH);
    assert!(RELAY_IN_BATCH as u64 <= l["relayInMax"].as_u64().unwrap());
    assert_eq!(l["scoreKeepaliveMs"], ms(KEEPALIVE));
    let s = &l["score"];
    assert_eq!(s["clients"], MAX_CLIENTS);
    assert_eq!(s["nameUnits"], NAME_UNITS);
    assert_eq!(s["mods"], MAX_MODS);
    assert_eq!(s["ipcStateMax"], IPC_STATE_MAX);
    assert_eq!(s["scoreMax"], i32::MAX);
    assert_eq!(s["accuracyMax"], ACCURACY_MAX);
    assert_eq!(f["liveRejects"], to_value(LIVE_REJECTS).unwrap());
}

#[test]
fn mod_format() {
    let m = &fixture()["modFormat"];
    assert!(m["valid"].as_array().unwrap().iter().all(|v| valid_mod(v.as_str().unwrap())));
    assert!(!m["invalid"].as_array().unwrap().iter().any(|v| valid_mod(v.as_str().unwrap())));
}

#[test]
fn status_codes_the_helper_reacts_to() {
    let e = &fixture()["errors"];
    assert_eq!(e["unpaired"], 401);
    for k in ["wrongname", "noref", "nostream", "noroles"] {
        assert_eq!(e[k], 403, "{k}");
    }
    assert_eq!(e["nomatch"], 409);
}

#[test]
fn pairing_replies() {
    let f = fixture();
    let s: Started = from_value(f["start"]["res"].clone()).unwrap();
    assert_eq!(s.code, f["start"]["res"]["code"]);
    let c: Claimed = from_value(f["claim"]["res"].clone()).unwrap();
    assert_eq!((c.token.as_str(), c.name.as_str()), (f["claim"]["res"]["token"].as_str().unwrap(), f["claim"]["res"]["name"].as_str().unwrap()));
}

#[test]
fn me_reply() {
    let f = fixture();
    let r: Roles = from_value(f["me"].clone()).unwrap();
    assert_eq!(r.id, f["me"]["id"]);
    assert_eq!(r.name, f["me"]["name"]);
    assert_eq!(r.can_ref, f["me"]["ref"]);
    assert_eq!(r.can_stream, f["me"]["stream"]);
    assert_eq!(Value::from(r.alerts), f["me"]["alerts"]);
}

#[test]
fn stream_frames() {
    let f = fixture();
    let frames: Vec<Msg> = f["stream"].as_array().unwrap().iter().map(|v| from_value(v.clone()).unwrap()).collect();
    let [hello, open, line, close, alerts] = &frames[..] else { panic!("expected 5 frames") };
    assert!(matches!(hello, Msg::Other));
    assert!(matches!(open, Msg::Open));
    assert!(matches!(line, Msg::Line { l } if *l == f["stream"][2]["l"]));
    assert!(matches!(close, Msg::Close));
    let Msg::Alerts { alerts } = alerts else { panic!("{alerts:?}") };
    assert_eq!(Value::from(alerts.clone()), f["stream"][4]["alerts"]);
}

#[test]
fn site_down_alert_shape() {
    let f = fixture();
    let since = f["siteDown"]["since"].as_u64().unwrap();
    assert_eq!(site_down_alert(since), f["siteDown"]);
    assert!(f["alertKinds"].as_array().unwrap().contains(&f["siteDown"]["kind"]));
}

#[test]
fn relay_in_events_round_trip() {
    let f = fixture();
    for ev in f["in"]["ev"].as_array().unwrap() {
        let parsed: Ev = from_value(ev.clone()).unwrap();
        assert_eq!(&to_value(parsed).unwrap(), ev);
    }
}

#[test]
fn score_packet_round_trip() {
    let f = fixture();
    let p: ScorePacket = from_value(f["score"]["req"].clone()).unwrap();
    assert_eq!(to_value(p).unwrap(), f["score"]["req"]);
    let ok: ScoreReply = from_value(f["score"]["ok"].clone()).unwrap();
    assert_eq!(ok.matched.as_deref(), f["score"]["ok"]["match"].as_str());
    let no: ScoreReply = from_value(f["score"]["reject"].clone()).unwrap();
    assert!(LIVE_REJECTS.contains(&no.error.as_deref().unwrap()));
}
