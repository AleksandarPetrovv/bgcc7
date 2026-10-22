fn site() -> Option<String> {
    if let Ok(v) = std::env::var("PUBLIC_URL") {
        return Some(v);
    }
    let env = std::fs::read_to_string("../../../host/.env").ok()?;
    env.lines().find_map(|l| l.trim().strip_prefix("PUBLIC_URL=")).map(|v| v.trim().trim_matches('"').to_string())
}

fn main() {
    println!("cargo:rerun-if-env-changed=PUBLIC_URL");
    println!("cargo:rerun-if-changed=../../../host/.env");
    let url = site().filter(|u| u.starts_with("https://")).expect("set PUBLIC_URL (https://...) in host/.env or the environment");
    println!("cargo:rustc-env=BGCC_SITE={}", url.trim_end_matches('/'));
    tauri_build::build()
}
