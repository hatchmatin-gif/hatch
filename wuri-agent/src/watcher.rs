use crate::printer;
use notify::{Config, RecommendedWatcher, RecursiveMode, Watcher,
             Event, EventKind};
use regex::Regex;
use std::collections::HashMap;
use std::fs::File;
use std::io::{BufRead, BufReader, Seek, SeekFrom};
use std::path::{Path, PathBuf};
use std::sync::Arc;
use std::time::Duration;
use tokio::sync::{mpsc, Mutex};

const LOG_PATH: &str = "C:\\_OKPOS\\CFG\\LOG";

// ── 판매 라인 정규식 ───────────────────────────────────────────────────────
// 예) Row[01] [신규등록    ] ProdCd[000003] Qty[  2] Amt[...] ProdNm[■ hot_아메리카노]
const ITEM_PATTERN: &str =
    r"Row\[\d+\]\s*\[신규등록\s*\]\s*ProdCd\[.*?\]\s*Qty\[\s*(\d+)\]\s*Amt\[.*?\]\s*Dc\[.*?\]\s*ProdNm\[(.*?)\]";
// 영수증 번호: "SaleFinish ... 영수증번호: 0001"
const BILL_PATTERN: &str = r"영수증번호:\s*(\d+)";

pub async fn start(
    printer_name: Arc<Mutex<Option<String>>>,
    supabase_url:  &'static str,
    supabase_key:  &'static str,
) {
    let watch_path = Path::new(LOG_PATH);

    // 폴더 생길 때까지 대기
    while !watch_path.exists() {
        println!("LOG 폴더 대기 중: {}", LOG_PATH);
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
    ).expect("watcher 생성 실패");

    watcher.watch(watch_path, RecursiveMode::NonRecursive)
           .expect("감시 실패");

    // 파일별 마지막 읽기 위치 추적
    let mut positions: HashMap<PathBuf, u64> = HashMap::new();
    // 한 영수증 안에서 모인 아이템들 (bill_no → items)
    let mut pending: HashMap<String, Vec<(String, u32)>> = HashMap::new();

    println!("OKPOS 로그 감시 중: {}", LOG_PATH);

    while let Some(event) = rx.recv().await {
        if !matches!(event.kind, EventKind::Modify(_)) { continue; }

        for path in event.paths {
            if path.extension().and_then(|e| e.to_str()) != Some("log") { continue; }

            let pos = positions.entry(path.clone()).or_insert(0);
            if let Ok(mut f) = File::open(&path) {
                let len = f.metadata().map(|m| m.len()).unwrap_or(0);
                if len < *pos { *pos = 0; }
                if len <= *pos { continue; }

                f.seek(SeekFrom::Start(*pos)).ok();
                let reader = BufReader::new(f);

                for line in reader.lines().flatten() {
                    // 아이템 라인 파싱
                    if let Some(caps) = item_re.captures(&line) {
                        let qty: u32 = caps[1].trim().parse().unwrap_or(1);
                        let name = caps[2].trim().to_string();
                        // 임시: bill 없이 "PENDING" 키로 모아둠
                        pending.entry("PENDING".to_string())
                               .or_default()
                               .push((name, qty));
                    }

                    // SaleFinish → 영수증 번호 확정 → 출력 + 업로드
                    if line.contains("SaleFinish") {
                        if let Some(caps) = bill_re.captures(&line) {
                            let bill_no = caps[1].to_string();
                            if let Some(items) = pending.remove("PENDING") {
                                // ── 출력 ──
                                let pn = printer_name.lock().await.clone();
                                if let Some(ref name) = pn {
                                    printer::print_order(name, &items, &bill_no);
                                }
                                // ── 업로드 ──
                                upload_sale(
                                    supabase_url, supabase_key,
                                    &bill_no, &items,
                                ).await;
                            }
                        }
                    }
                }
                *pos = len;
            }
        }
    }
}

async fn upload_sale(
    url: &str, key: &str,
    bill_no: &str,
    items: &[(String, u32)],
) {
    let client = reqwest::Client::new();
    let payload = serde_json::json!({
        "source": "OKPOS",
        "bill_no": bill_no,
        "status": "완료됨",
        "items": items.iter().map(|(n,q)| serde_json::json!({"name":n,"qty":q})).collect::<Vec<_>>()
    });

    let resp = client
        .post(format!("{}/rest/v1/sales_log", url))
        .header("apikey", key)
        .header("Authorization", format!("Bearer {}", key))
        .header("Content-Type", "application/json")
        .header("Prefer", "return=minimal")
        .json(&payload)
        .send()
        .await;

    match resp {
        Ok(r)  => println!("Supabase 전송 완료 [{}]: {}", bill_no, r.status()),
        Err(e) => eprintln!("Supabase 전송 실패 [{}]: {}", bill_no, e),
    }
}
