// ============================================================
// WURI POS – Tauri 앱 초기화
// - OKPOS 로그 감시 백그라운드 스폰
// - 시스템 트레이 아이콘 (창을 닫아도 계속 실행)
// - 윈도우 자동 시작 프로그램 등록
// ============================================================

mod okpos_watcher;
mod printer;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            // ── 자동 시작 프로그램 등록 (Windows 레지스트리) ──────────
            #[cfg(windows)]
            register_autostart();

            // ── 트레이 아이콘 설정 ────────────────────────────────────
            use tauri::{
                menu::{Menu, MenuItem},
                tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
                Manager,
            };

            let quit = MenuItem::with_id(app, "quit", "WURI POS 종료", true, None::<&str>)?;
            let show = MenuItem::with_id(app, "show", "창 열기", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show, &quit])?;

            let _tray = TrayIconBuilder::new()
                .menu(&menu)
                .tooltip("WURI POS 실행 중")
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "quit" => {
                        println!("[WURI] 종료");
                        app.exit(0);
                    }
                    "show" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                })
                .build(app)?;

            // ── 창 닫기 → 트레이로 숨기기 ────────────────────────────
            if let Some(window) = app.get_webview_window("main") {
                let win = window.clone();
                window.on_window_event(move |event| {
                    if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                        api.prevent_close();
                        let _ = win.hide();
                    }
                });
            }

            // ── OKPOS 백그라운드 감시 스폰 ───────────────────────────
            let app_handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                okpos_watcher::start_watcher(app_handle).await;
            });

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("[WURI] 앱 실행 실패");
}

// ── 윈도우 시작 프로그램 자동 등록 ────────────────────────────
#[cfg(windows)]
fn register_autostart() {
    use std::ffi::OsStr;
    use std::os::windows::ffi::OsStrExt;
    use winapi::um::winreg::{RegOpenKeyExW, RegSetValueExW, HKEY_CURRENT_USER};
    use winapi::um::winnt::{KEY_SET_VALUE, REG_SZ};

    let exe_path = match std::env::current_exe() {
        Ok(p) => p,
        Err(_) => return,
    };

    let reg_path: Vec<u16> = OsStr::new(
        "Software\\Microsoft\\Windows\\CurrentVersion\\Run"
    ).encode_wide().chain(Some(0)).collect();

    let value_name: Vec<u16> = OsStr::new("WuriPOS")
        .encode_wide().chain(Some(0)).collect();

    let exe_str = exe_path.to_string_lossy();
    let exe_val: Vec<u16> = OsStr::new(exe_str.as_ref())
        .encode_wide().chain(Some(0)).collect();

    unsafe {
        let mut hkey = std::ptr::null_mut();
        if RegOpenKeyExW(
            HKEY_CURRENT_USER,
            reg_path.as_ptr(),
            0, KEY_SET_VALUE, &mut hkey,
        ) == 0 {
            RegSetValueExW(
                hkey,
                value_name.as_ptr(),
                0, REG_SZ,
                exe_val.as_ptr() as *const u8,
                (exe_val.len() * 2) as u32,
            );
            winapi::um::winreg::RegCloseKey(hkey);
            println!("[WURI] 자동 시작 등록 완료");
        } else {
            eprintln!("[WURI] 자동 시작 등록 실패 (권한 없음)");
        }
    }
}
