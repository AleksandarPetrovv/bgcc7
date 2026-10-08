pub fn is_mp(t: &str) -> bool {
    t.len() > 4 && t.starts_with("#mp_") && t[4..].bytes().all(|b| b.is_ascii_digit())
}

fn is_bancho(t: &str) -> bool {
    t.eq_ignore_ascii_case("BanchoBot")
}

pub fn outbound(line: &str, nick: &str, pass: &str) -> Option<String> {
    if line.contains(['\r', '\n', '\0']) {
        return None;
    }
    let (cmd, rest) = line.split_once(' ').unwrap_or((line, ""));
    match cmd.to_ascii_uppercase().as_str() {
        "PASS" => Some(format!("PASS {pass}")),
        "USER" => Some(format!("USER {nick} 0 * :{nick}")),
        "NICK" => Some(format!("NICK {nick}")),
        "PONG" => Some(line.to_string()),
        "QUIT" => Some("QUIT".into()),
        c @ ("JOIN" | "PART") => {
            let t = rest.split(' ').next()?.trim_start_matches(':');
            is_mp(t).then(|| format!("{c} {t}"))
        }
        "PRIVMSG" => {
            let (t, msg) = rest.split_once(' ')?;
            (is_mp(t) || is_bancho(t)).then(|| format!("PRIVMSG {t} {msg}"))
        }
        _ => None,
    }
}

pub fn inbound(line: &str, nick: &str) -> bool {
    let (prefix, body) = match line.strip_prefix(':') {
        Some(l) => l.split_once(' ').unwrap_or((l, "")),
        None => ("", line),
    };
    let from = prefix.split('!').next().unwrap_or("");
    let mut parts = body.split(' ');
    let cmd = parts.next().unwrap_or("");
    let first = parts.next().unwrap_or("").trim_start_matches(':');
    if cmd.len() == 3 && cmd.bytes().all(|b| b.is_ascii_digit()) {
        return match body.split(' ').map(|p| p.trim_start_matches(':')).find(|p| p.starts_with('#')) {
            Some(ch) => is_mp(ch),
            None => true,
        };
    }
    match cmd {
        "JOIN" | "PART" | "KICK" | "MODE" | "TOPIC" => is_mp(first),
        "PRIVMSG" | "NOTICE" => is_mp(first) || (first.eq_ignore_ascii_case(nick) && is_bancho(from)),
        _ => false,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn out() {
        assert_eq!(outbound("PASS relay", "ref", "secret").as_deref(), Some("PASS secret"));
        assert_eq!(outbound("PRIVMSG #mp_123 :!mp start", "ref", "x").as_deref(), Some("PRIVMSG #mp_123 :!mp start"));
        assert_eq!(outbound("PRIVMSG BanchoBot :!mp make a", "ref", "x").as_deref(), Some("PRIVMSG BanchoBot :!mp make a"));
        assert!(outbound("PRIVMSG someone :hi", "ref", "x").is_none());
        assert!(outbound("PRIVMSG #osu :hi", "ref", "x").is_none());
        assert!(outbound("JOIN #osu", "ref", "x").is_none());
        assert!(outbound("PRIVMSG #mp_1 :a\r\nPRIVMSG x :b", "ref", "x").is_none());
    }

    #[test]
    fn inn() {
        assert!(inbound(":BanchoBot!cho@ppy.sh PRIVMSG ref :Created the tournament match", "ref"));
        assert!(inbound(":someone!cho@ppy.sh PRIVMSG #mp_5 :hello", "ref"));
        assert!(!inbound(":friend!cho@ppy.sh PRIVMSG ref :secret dm", "ref"));
        assert!(!inbound(":friend!cho@ppy.sh PRIVMSG #osu :hi", "ref"));
        assert!(inbound(":cho.ppy.sh 001 ref :Welcome", "ref"));
        assert!(!inbound(":cho.ppy.sh 353 ref = #osu :a b c", "ref"));
        assert!(inbound(":cho.ppy.sh 353 ref = #mp_5 :a b c", "ref"));
        assert!(inbound(":ref!cho@ppy.sh JOIN :#mp_5", "ref"));
        assert!(!inbound(":ref!cho@ppy.sh JOIN :#osu", "ref"));
    }
}
