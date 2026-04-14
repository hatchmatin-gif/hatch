use notify::{Config, RecommendedWatcher, RecursiveMode, Watcher, Event, EventKind};
use regex::Regex;
use std::collections::HashMap;
use std::fs::File;
use std::io::{BufRead, BufReader, Seek, SeekFrom};
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};
use std::time::Duration;
use tokio::sync::mpsc;
use tauri::Manager;

pub async fn start_watcher(app_handle: tauri::AppHandle) {
    let watch_path = Path::new("C:\\_OKPOS\\LOG"); // 실제 OKPOS 로그 폴더 경로 (수정 가능)

    // 폴더가 없으면 대기 후 재시도
    while !watch_path.exists() {
        println!("Waiting for directory {:?} to be created...", watch_path);
        tokio::time::sleep(Duration::from_secs(5)).await;
    }

    let (tx, mut rx) = mpsc::channel(100);

    let mut watcher = RecommendedWatcher::new(
        move |res: notify::Result<Event>| {
            if let Ok(event) = res {
                let _ = tx.blocking_send(event);
            }
        },
        Config::default(),
    ).expect("Failed to create watcher");

    watcher
        .watch(watch_path, RecursiveMode::NonRecursive)
        .expect("Failed to watch directory");

    let file_positions: Arc<Mutex<HashMap<PathBuf, u64>>> = Arc::new(Mutex::new(HashMap::new()));
    
    // 정규식: Row[01] [신규등록    ] ProdCd[000003] Qty[  2] Amt[        6000] Dc[        0] ProdNm[■ hot_아메리카노] 
    let item_regex = Regex::new(r"Row\[\d+\]\s*\[신규등록\s*\]\s*ProdCd\[.*?\]\s*Qty\[\s*(\d+)\]\s*Amt\[.*?\]\s*Dc\[.*?\]\s*ProdNm\[(.*?)\]").unwrap();

    println!("Started OKPOS Log Watcher on {:?}", watch_path);

    while let Some(event) = rx.recv().await {
        match event.kind {
            EventKind::Modify(_) => {
                for path in event.paths {
                    if path.extension().and_then(|s| s.to_str()) != Some("log") {
                        continue;
                    }

                    let mut positions = file_positions.lock().unwrap();
                    let pos = positions.entry(path.clone()).or_insert(0);

                    if let Ok(mut file) = File::open(&path) {
                        if let Ok(metadata) = file.metadata() {
                            let len = metadata.len();
                            if len < *pos {
                                // 파일이 새로 만들어졌거나 잘렸을 경우
                                *pos = 0;
                            }
                            if len > *pos {
                                file.seek(SeekFrom::Start(*pos)).unwrap();
                                let reader = BufReader::new(file);
                                
                                for line in reader.lines().flatten() {
                                    if let Some(caps) = item_regex.captures(&line) {
                                        let qty = caps.get(1).map_or("", |m| m.as_str()).trim();
                                        let prod_nm = caps.get(2).map_or("", |m| m.as_str()).trim();
                                        
                                        println!("Detected Sale! Product: {}, Quantity: {}", prod_nm, qty);
                                        
                                        // TODO: 여기서 Supabase로 REST API 전송 또는 프론트엔드로 이벤트 송신!
                                        // 예시: 프론트엔드쪽으로 'okpos-sale' 이벤트를 날림
                                        app_handle.emit("okpos-sale", serde_json::json!({
                                            "product": prod_nm,
                                            "qty": qty
                                        })).unwrap();
                                    }
                                }
                                *pos = len;
                            }
                        }
                    }
                }
            }
            _ => {}
        }
    }
}
