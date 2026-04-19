// ============================================================
// WURI POS – OKPOS 로그 감시자
// C:\_OKPOS\CFG\LOG\ 폴더의 .log 파일 변화를 실시간 감지하여
// ① 주방 주문서를 K-1000 프린터로 출력하고
// ② Supabase(sales_log)에 결제 데이터를 전송합니다.
// ============================================================

use crate::printer;
use notify::{Config, RecommendedWatcher, RecursiveMode, Watcher, Event, EventKind};
use regex::Regex;
use serde::Deserialize;
use std::collections::HashMap;
use std::io::{BufRead, BufReader, Seek, SeekFrom};
use std::path::{Path, PathBuf};
use std::time::Duration;
use tokio::sync::mpsc;

const LOG_PATH: &str = "C:\\_OKPOS\\CFG\\LOG";

// OKPOS 로그 정규식
// 예) Row[01] [신규등록    ] ProdCd[000003] Qty[  2] Amt[...] ProdNm[■ hot_아메리카노]
const ITEM_PATTERN: &str =
    r"Row\[\d+\]\s*\[신규등록\s*\]\s*ProdCd\[.*?\]\s*Qty\[\s*(\d+)\]\s*Amt\[.*?\]\s*Dc\[.*?\]\s*ProdNm\[(.*?)\]";
// 결제 완료 후 영수증 번호
const BILL_PATTERN: &str = r"영수증번호:\s*(\d+)";

// ── 외부 설정 파일 ────────────────────────────────────────────
#[derive(Deserialize, Debug, Clone)]
pub struct AgentConfig {
    pub supabase_url: String,
    pub supabase_key: String,
    pub pos_url: Option<String>,
}

impl AgentConfig {
    /// wuri-agent 폴더 옆의 config.json, 없으면 하드코딩된 기본값 사용
    pub fn load() -> Self {
        let config_path = std::env::current_exe()
            .ok()
            .and_then(|p| p.parent().map(|d| d.join("config.json")));

        if let Some(path) = config_path {
            if let Ok(content) = std::fs::read_to_string(&path) {
                if let Ok(cfg) = serde_json::from_str::<AgentConfig>(&content) {
                    println!("[WURI] 설정 파일 로드 완료: {:?}", path);
                    return cfg;
                }
            }
        }

        // 기본값 (config.json이 없을 때)
        println!("[WURI] config.json 없음 → 기본값 사용");
        AgentConfig {
            supabase_url: "https://emclresadhbaogtjfves.supabase.co".to_string(),
            supabase_key: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVtY2xyZXNhZGhiYW9ndGpmdmVzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4NTA1OTIsImV4cCI6MjA5MTQyNjU5Mn0.FkgRxM8ikv7z4PexCnxCidj5J62Z7v0BoFmmULjqotU".to_string(),
            pos_url: Some("http://wuricafe.com/pos".to_string()),
        }
    }
}

// ── 메인 감시 루프 ────────────────────────────────────────────
pub async fn start_watcher(app_handle: tauri::AppHandle) {
    let config = AgentConfig::load();
    let watch_path = Path::new(LOG_PATH);

    // LOG 폴더가 생길 때까지 대기 (OKPOS 실행 전 경우 대비)
    while !watch_path.exists() {
        println!("[WURI] LOG 폴더 대기 중: {}", LOG_PATH);
        tokio::time::sleep(Duration::from_secs(5)).await;
    }

    let item_re = Regex::new(ITEM_PATTERN).unwrap();
    let bill_re = Regex::new(BILL_PATTERN).unwrap();

    let (tx, mut rx) = mpsc::channel::<Event>(100);

    let mut watcher = RecommendedWatcher::new(
        move |res: notify::Result<Event>| {
            if let Ok(ev) = res { let _ = tx.blocking_send(ev); }
        },
        Config::default(),
    ).expect("[WURI] watcher 생성 실패");

    watcher.watch(watch_path, RecursiveMode::NonRecursive)
           .expect("[WURI] 감시 시작 실패");

    let mut positions: HashMap<PathBuf, u64> = HashMap::new();
    let mut pending: Vec<(String, u32)> = Vec::new();

    // 프린터 탐색 (시작 시 1회)
    let printer_name = printer::find_k1000_printer();
    match &printer_name {
        Some(n) => println!("[WURI] 영수증 프린터: {}", n),
        None    => println!("[WURI] 경고: 프린터를 찾지 못했습니다."),
    }

    println!("[WURI] OKPOS 로그 감시 시작: {}", LOG_PATH);

    while let Some(event) = rx.recv().await {
        if !matches!(event.kind, EventKind::Modify(_)) { continue; }

        for path in event.paths {
            if path.extension().and_then(|e| e.to_str()) != Some("log") { continue; }

            // 파일 공유 모드로 열기 (OKPOS가 기록 중이어도 읽기 가능)
            #[cfg(windows)]
            let file_result = {
                use std::os::windows::fs::OpenOptionsExt;
                let mut opt = std::fs::OpenOptions::new();
                opt.read(true).share_mode(7); // READ | WRITE | DELETE
                opt.open(&path)
            };
            #[cfg(not(windows))]
            let file_result = std::fs::File::open(&path);

            let Ok(file) = file_result else { continue; };

            let len = file.metadata().map(|m| m.len()).unwrap_or(0);
            let pos = positions.entry(path.clone()).or_insert(0);

            if len < *pos { *pos = 0; }          // 파일 재생성 감지
            if len <= *pos { continue; }

            let mut file = file;
            file.seek(SeekFrom::Start(*pos)).ok();

            let mut reader = BufReader::new(file);
            let mut buf = Vec::new();

            // 바이트 단위로 읽어 CP949 → UTF-8 변환
            while let Ok(n) = reader.read_until(b'\n', &mut buf) {
                if n == 0 { break; }
                let line = decode_cp949(&buf);
                buf.clear();

                // 아이템 감지
                if let Some(caps) = item_re.captures(&line) {
                    let qty: u32 = caps[1].trim().parse().unwrap_or(1);
                    let name = caps[2].trim().to_string();
                    println!("[WURI]  - 아이템: {} x {}", name, qty);
                    pending.push((name, qty));
                }

                // 결제 완료 감지
                if line.contains("SaleFinish") {
                    if let Some(caps) = bill_re.captures(&line) {
                        let bill_no = caps[1].to_string();
                        if !pending.is_empty() {
                            let items = std::mem::take(&mut pending);
                            println!("[WURI] 결제 완료! 주문 {} ({}종)", bill_no, items.len());

                            // ① 프린터 출력
                            if let Some(ref pname) = printer_name {
                                printer::print_order(pname, &items, &bill_no);
                            }

                            // ② Supabase 업로드 (재시도 포함)
                            let cfg = config.clone();
                            let bn  = bill_no.clone();
                            let it  = items.clone();
                            let _ah = app_handle.clone();
                            tokio::spawn(async move {
                                upload_with_retry(&cfg, &bn, &it).await;
                            });
                        }
                    }
                }
            }
            *pos = len;
        }
    }
}

// ── Supabase 업로드 (최대 3회 재시도, 지수 백오프) ─────────────
async fn upload_with_retry(cfg: &AgentConfig, bill_no: &str, items: &[(String, u32)]) {
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(10))
        .build()
        .unwrap_or_default();

    let payload = serde_json::json!({
        "source":  "OKPOS",
        "bill_no": bill_no,
        "status":  "완료됨",
        "items":   items.iter().map(|(n, q)| serde_json::json!({"name": n, "qty": q})).collect::<Vec<_>>()
    });

    for attempt in 1..=3u32 {
        let resp = client
            .post(format!("{}/rest/v1/sales_log", cfg.supabase_url))
            .header("apikey",        &cfg.supabase_key)
            .header("Authorization", format!("Bearer {}", cfg.supabase_key))
            .header("Content-Type",  "application/json")
            .header("Prefer",        "return=minimal")
            .json(&payload)
            .send()
            .await;

        match resp {
            Ok(r) if r.status().is_success() => {
                println!("[WURI] Supabase 업로드 완료 [{}]", bill_no);
                return;
            }
            Ok(r) => {
                eprintln!("[WURI] Supabase 오류 응답 [{}] 시도 {}/3: {}", bill_no, attempt, r.status());
            }
            Err(e) => {
                eprintln!("[WURI] Supabase 전송 실패 [{}] 시도 {}/3: {}", bill_no, attempt, e);
            }
        }

        if attempt < 3 {
            let wait = Duration::from_secs(2u64.pow(attempt)); // 2s, 4s
            tokio::time::sleep(wait).await;
        }
    }
    eprintln!("[WURI] Supabase 업로드 최종 실패 [{}] – 데이터 손실 없도록 로그 확인 필요", bill_no);
}

// ── CP949(EUC-KR) 디코더 ─────────────────────────────────────
fn decode_cp949(bytes: &[u8]) -> String {
    #[cfg(windows)]
    {
        use winapi::um::stringapiset::MultiByteToWideChar;
        unsafe {
            let len = MultiByteToWideChar(
                949, 0,
                bytes.as_ptr() as *const i8, bytes.len() as i32,
                std::ptr::null_mut(), 0,
            );
            if len > 0 {
                let mut wide = vec![0u16; len as usize];
                MultiByteToWideChar(
                    949, 0,
                    bytes.as_ptr() as *const i8, bytes.len() as i32,
                    wide.as_mut_ptr(), len,
                );
                return String::from_utf16_lossy(&wide);
            }
        }
    }
    String::from_utf8_lossy(bytes).to_string()
}
