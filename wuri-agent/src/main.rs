mod printer;
mod watcher;

use std::sync::Arc;
use tokio::sync::Mutex;

// ───────────────────────────────────────────
// Supabase 설정 (실제 값으로 교체)
// ───────────────────────────────────────────
const SUPABASE_URL: &str = "https://emclresadhbaogtjfves.supabase.co";
const SUPABASE_KEY: &str = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVtY2xyZXNhZGhiYW9ndGpmdmVzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4NTA1OTIsImV4cCI6MjA5MTQyNjU5Mn0.FkgRxM8ikv7z4PexCnxCidj5J62Z7v0BoFmmULjqotU";

#[tokio::main]
async fn main() {
    println!("WURI Agent 시작...");

    // 1) 브라우저로 POS 화면 열기
    open_pos_browser();

    // 2) 프린터 이름 탐색
    let printer_name = printer::find_k1000_printer();
    match &printer_name {
        Some(n) => println!("영수증 프린터 발견: {}", n),
        None    => println!("경고: 나이스체크 K-1000 프린터를 찾지 못했습니다."),
    }
    let printer_name = Arc::new(Mutex::new(printer_name));

    // 3) OKPOS 로그 감시 시작 (이벤트 발생 시 → 출력 + Supabase 업로드)
    watcher::start(printer_name, SUPABASE_URL, SUPABASE_KEY).await;
}

fn open_pos_browser() {
    #[cfg(windows)]
    {
        use std::ffi::OsStr;
        use std::os::windows::ffi::OsStrExt;
        use winapi::um::shellapi::ShellExecuteW;
        use winapi::um::winuser::SW_SHOWNORMAL;

        let url: Vec<u16> = OsStr::new("http://wuricafe.com/pos")
            .encode_wide().chain(Some(0)).collect();
        let open: Vec<u16> = OsStr::new("open")
            .encode_wide().chain(Some(0)).collect();

        unsafe {
            ShellExecuteW(
                std::ptr::null_mut(),
                open.as_ptr(),
                url.as_ptr(),
                std::ptr::null(),
                std::ptr::null(),
                SW_SHOWNORMAL as i32,
            );
        }
    }
}
