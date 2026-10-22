use serde::{Deserialize, Serialize};
use std::path::PathBuf;

const SERVICE: &str = "bgcc-ref";

#[derive(Serialize, Deserialize, Default, Clone)]
pub struct Config {
    pub name: String,
    #[serde(default)]
    pub id: u64,
    pub token: Option<String>,
}

pub struct Store {
    file: PathBuf,
}

impl Store {
    pub fn new(dir: PathBuf) -> Self {
        let _ = std::fs::create_dir_all(&dir);
        Self { file: dir.join("config.json") }
    }

    pub fn load(&self) -> Config {
        std::fs::read(&self.file).ok().and_then(|b| serde_json::from_slice(&b).ok()).unwrap_or_default()
    }

    pub fn save(&self, c: &Config) {
        if let Ok(b) = serde_json::to_vec_pretty(c) {
            let _ = std::fs::write(&self.file, b);
        }
    }

    pub fn password(&self, name: &str) -> Option<String> {
        keyring::Entry::new(SERVICE, name).ok()?.get_password().ok()
    }

    pub fn set_password(&self, name: &str, pass: &str) -> Result<(), String> {
        keyring::Entry::new(SERVICE, name).and_then(|e| e.set_password(pass)).map_err(|e| e.to_string())
    }

    pub fn forget(&self, name: &str) {
        if let Ok(e) = keyring::Entry::new(SERVICE, name) {
            let _ = e.delete_credential();
        }
        self.save(&Config::default());
    }
}
