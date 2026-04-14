/// 나이스체크 K-1000 (또는 유사 이름) 프린터를 Windows 프린터 목록에서 탐색
#[cfg(windows)]
pub fn find_k1000_printer() -> Option<String> {
    use std::slice;
    use winapi::um::winspool::{
        EnumPrintersW, PRINTER_ENUM_LOCAL, PRINTER_ENUM_CONNECTIONS, PRINTER_INFO_2W,
    };

    unsafe {
        let mut bytes_needed: u32 = 0;
        let mut count: u32 = 0;

        // 필요한 버퍼 크기 조회
        EnumPrintersW(
            PRINTER_ENUM_LOCAL | PRINTER_ENUM_CONNECTIONS,
            std::ptr::null_mut(), 2,
            std::ptr::null_mut(), 0,
            &mut bytes_needed, &mut count,
        );
        if bytes_needed == 0 { return None; }

        let mut buf = vec![0u8; bytes_needed as usize];
        let ok = EnumPrintersW(
            PRINTER_ENUM_LOCAL | PRINTER_ENUM_CONNECTIONS,
            std::ptr::null_mut(), 2,
            buf.as_mut_ptr(), bytes_needed,
            &mut bytes_needed, &mut count,
        );
        if ok == 0 { return None; }

        let infos = slice::from_raw_parts(
            buf.as_ptr() as *const PRINTER_INFO_2W,
            count as usize,
        );
        for info in infos {
            if info.pPrinterName.is_null() { continue; }
            let name = wstr_to_string(info.pPrinterName);
            let lower = name.to_lowercase();
            if lower.contains("나이스") || lower.contains("nice") ||
               lower.contains("k-1000") || lower.contains("k1000") ||
               lower.contains("k 1000") || lower.contains("naice")
            {
                return Some(name);
            }
        }
        // 못 찾으면 첫 번째 로컬 프린터 반환
        if count > 0 && !infos[0].pPrinterName.is_null() {
            Some(wstr_to_string(infos[0].pPrinterName))
        } else {
            None
        }
    }
}

#[cfg(not(windows))]
pub fn find_k1000_printer() -> Option<String> { None }

/// 주문서를 ESC/POS 형식으로 나이스체크 K-1000에 출력
#[cfg(windows)]
pub fn print_order(printer_name: &str, items: &[(String, u32)], bill_no: &str) {
    use std::ffi::OsStr;
    use std::os::windows::ffi::OsStrExt;
    use winapi::um::winspool::{
        OpenPrinterW, ClosePrinter, StartDocPrinterW, EndDocPrinter,
        StartPagePrinter, EndPagePrinter, WritePrinter, DOC_INFO_1W,
    };

    let pname: Vec<u16> = OsStr::new(printer_name)
        .encode_wide().chain(Some(0)).collect();
    let docname: Vec<u16> = OsStr::new("WURI-Order")
        .encode_wide().chain(Some(0)).collect();
    let datatype: Vec<u16> = OsStr::new("RAW")
        .encode_wide().chain(Some(0)).collect();

    let data = build_escpos(items, bill_no);

    unsafe {
        let mut h = std::ptr::null_mut();
        if OpenPrinterW(pname.as_ptr() as *mut _, &mut h, std::ptr::null_mut()) == 0 {
            eprintln!("프린터 열기 실패: {}", printer_name);
            return;
        }

        let mut doc = DOC_INFO_1W {
            pDocName:    docname.as_ptr() as *mut _,
            pOutputFile: std::ptr::null_mut(),
            pDatatype:   datatype.as_ptr() as *mut _,
        };

        let job = StartDocPrinterW(h, 1, &mut doc as *mut _ as *mut _);
        if job > 0 {
            StartPagePrinter(h);
            let mut written = 0u32;
            WritePrinter(h, data.as_ptr() as *mut _, data.len() as u32, &mut written);
            EndPagePrinter(h);
            EndDocPrinter(h);
            println!("출력 완료 ({} bytes → {})", written, printer_name);
        } else {
            eprintln!("StartDocPrinter 실패");
        }
        ClosePrinter(h);
    }
}

#[cfg(not(windows))]
pub fn print_order(_: &str, _: &[(String, u32)], _: &str) {}

// ── ESC/POS 바이트 빌더 ────────────────────────────────────────────────────
fn build_escpos(items: &[(String, u32)], bill_no: &str) -> Vec<u8> {
    let mut d: Vec<u8> = Vec::new();

    // 초기화
    d.extend_from_slice(b"\x1b\x40");

    // 가운데 정렬 + 굵게
    d.extend_from_slice(b"\x1b\x61\x01\x1b\x45\x01");

    cp949_push(&mut d, "=== WURI 주방 주문서 ===\n");
    cp949_push(&mut d, &format!("주문 : {}\n", bill_no));

    // 왼쪽 정렬 + 굵기 해제
    d.extend_from_slice(b"\x1b\x61\x00\x1b\x45\x00");
    d.extend_from_slice(b"--------------------------------\n");

    for (name, qty) in items {
        cp949_push(&mut d, &format!("  {} x {}잔\n", name, qty));
    }

    d.extend_from_slice(b"--------------------------------\n");
    cp949_push(&mut d, "[결제 완료]\n");

    // 5줄 피드 + 부분 절단
    d.extend_from_slice(b"\x1b\x64\x05");
    d.extend_from_slice(b"\x1d\x56\x42\x10");

    d
}

/// UTF-8 문자열 → CP949(EUC-KR) 인코딩 후 Vec<u8>에 추가
fn cp949_push(buf: &mut Vec<u8>, text: &str) {
    #[cfg(windows)]
    {
        use winapi::um::stringapiset::WideCharToMultiByte;
        let wide: Vec<u16> = text.encode_utf16().collect();
        unsafe {
            let sz = WideCharToMultiByte(
                949, 0,
                wide.as_ptr(), wide.len() as i32,
                std::ptr::null_mut(), 0,
                std::ptr::null(), std::ptr::null_mut(),
            );
            if sz > 0 {
                let mut tmp = vec![0u8; sz as usize];
                WideCharToMultiByte(
                    949, 0,
                    wide.as_ptr(), wide.len() as i32,
                    tmp.as_mut_ptr() as *mut i8, sz,
                    std::ptr::null(), std::ptr::null_mut(),
                );
                buf.extend_from_slice(&tmp);
            }
        }
    }
    #[cfg(not(windows))]
    buf.extend_from_slice(text.as_bytes());
}

#[cfg(windows)]
unsafe fn wstr_to_string(p: *const u16) -> String {
    let len = (0..).take_while(|&i| *p.add(i) != 0).count();
    String::from_utf16_lossy(std::slice::from_raw_parts(p, len))
}
