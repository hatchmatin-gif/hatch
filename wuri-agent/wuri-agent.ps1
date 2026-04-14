# ============================================================
# WURI Agent v1.0 - Windows 7 Embedded 호환
# 더블클릭 또는 시작 프로그램에 등록하여 사용
# ============================================================

$LOG_PATH     = "C:\_OKPOS\CFG\LOG"
$SUPABASE_URL = "https://emclresadhbaogtjfves.supabase.co"
$SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVtY2xyZXNhZGhiYW9ndGpmdmVzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4NTA1OTIsImV4cCI6MjA5MTQyNjU5Mn0.FkgRxM8ikv7z4PexCnxCidj5J62Z7v0BoFmmULjqotU"
$POS_URL      = "http://wuricafe.com/pos"

# ── 정규식 패턴 ────────────────────────────────────────────
$ITEM_RE      = 'Row\[\d+\]\s*\[신규등록\s*\]\s*ProdCd\[.*?\]\s*Qty\[\s*(\d+)\]\s*Amt\[.*?\]\s*Dc\[.*?\]\s*ProdNm\[(.*?)\]'
$FINISH_RE    = 'SaleFinish'
$BILL_RE      = '영수증번호:\s*(\d+)'

# ── 프린터 자동 감지 ────────────────────────────────────────
function Find-Printer {
    $keywords = @("나이스", "NICE", "K-1000", "K1000", "K 1000")
    $printers  = Get-WmiObject -Class Win32_Printer
    foreach ($kw in $keywords) {
        $match = $printers | Where-Object { $_.Name -like "*$kw*" } | Select-Object -First 1
        if ($match) {
            Write-Host "[WURI] 영수증 프린터 발견: $($match.Name)"
            return $match.Name
        }
    }
    # 못 찾으면 첫 번째 로컬 프린터
    $fallback = $printers | Where-Object { $_.Local -eq $true } | Select-Object -First 1
    if ($fallback) {
        Write-Host "[WURI] 폴백 프린터 사용: $($fallback.Name)"
        return $fallback.Name
    }
    Write-Host "[WURI] 경고: 프린터를 찾지 못했습니다."
    return $null
}

# ── 주문서 출력 ─────────────────────────────────────────────
function Print-Order($printerName, $items, $billNo) {
    if (-not $printerName) { return }

    $line = "-" * 32
    $text = "=== WURI 주방 주문서 ===`r`n"
    $text += "$line`r`n"
    $text += "주문 번호 : $billNo`r`n"
    $text += "$line`r`n"
    foreach ($item in $items) {
        $text += "  $($item.name)  x $($item.qty) 잔`r`n"
    }
    $text += "$line`r`n"
    $text += "       [ 결제 완료 ]`r`n"
    $text += "`r`n`r`n`r`n"

    # CP949(한국어) 인코딩으로 임시 파일 저장 후 프린터 전송
    $tmpPath = [System.IO.Path]::Combine($env:TEMP, "wuri_order_$billNo.txt")
    [System.IO.File]::WriteAllText($tmpPath, $text, [System.Text.Encoding]::GetEncoding(949))

    Get-Content -Path $tmpPath -Encoding Default | Out-Printer -Name $printerName
    Remove-Item $tmpPath -ErrorAction SilentlyContinue

    Write-Host "[WURI] 출력 완료 → $printerName (주문 $billNo)"
}

# ── Supabase 업로드 ────────────────────────────────────────
function Upload-Sale($billNo, $items) {
    try {
        $itemsJson = $items | ForEach-Object {
            @{ name = $_.name; qty = $_.qty }
        }
        $body = @{
            source   = "OKPOS"
            bill_no  = $billNo
            status   = "완료됨"
            items    = $itemsJson
        } | ConvertTo-Json -Depth 5

        $headers = @{
            "apikey"        = $SUPABASE_KEY
            "Authorization" = "Bearer $SUPABASE_KEY"
            "Content-Type"  = "application/json"
            "Prefer"        = "return=minimal"
        }
        Invoke-RestMethod -Uri "$SUPABASE_URL/rest/v1/sales_log" `
                          -Method POST -Headers $headers -Body $body
        Write-Host "[WURI] Supabase 업로드 완료 (주문 $billNo)"
    } catch {
        Write-Host "[WURI] Supabase 업로드 실패: $_"
    }
}

# ── 파일 파싱 ──────────────────────────────────────────────
$filePositions = @{}
$pendingItems  = [System.Collections.Generic.List[object]]::new()

function Read-NewLines($filePath) {
    if (-not (Test-Path $filePath)) { return }

    $len = (Get-Item $filePath).Length
    $pos = if ($filePositions.ContainsKey($filePath)) { $filePositions[$filePath] } else { 0 }
    if ($len -le $pos)  { return }

    $fs     = [System.IO.File]::Open($filePath, 'Open', 'Read', 'ReadWrite')
    $reader = New-Object System.IO.StreamReader($fs, [System.Text.Encoding]::GetEncoding(949))
    $fs.Seek($pos, 'Begin') | Out-Null

    while (-not $reader.EndOfStream) {
        $line = $reader.ReadLine()

        # 아이템 감지
        if ($line -match $ITEM_RE) {
            $qty  = [int]$Matches[1].Trim()
            $name = $Matches[2].Trim()
            $pendingItems.Add([PSCustomObject]@{ name = $name; qty = $qty })
            Write-Host "[WURI]  - 아이템: $name x $qty"
        }

        # 결제 완료 감지
        if ($line -match $FINISH_RE) {
            $billNo = "0000"
            if ($line -match $BILL_RE) { $billNo = $Matches[1] }

            if ($pendingItems.Count -gt 0) {
                $snapshot = $pendingItems.ToArray()
                $pendingItems.Clear()

                Write-Host "[WURI] 결제 완료! 주문 $billNo (${snapshot.Count}종)"
                Print-Order $printerName $snapshot $billNo
                Upload-Sale $billNo $snapshot
            }
        }
    }

    $filePositions[$filePath] = $fs.Position
    $reader.Close()
    $fs.Close()
}

# ═══════════════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════════════
Write-Host "==============================="
Write-Host "  WURI Agent 시작"
Write-Host "==============================="

# 브라우저로 POS 화면 열기
Start-Process $POS_URL

# 프린터 탐색
$printerName = Find-Printer

# LOG 폴더 대기
while (-not (Test-Path $LOG_PATH)) {
    Write-Host "[WURI] LOG 폴더 대기 중: $LOG_PATH"
    Start-Sleep -Seconds 5
}

Write-Host "[WURI] 로그 감시 시작: $LOG_PATH"

# FileSystemWatcher 설정
$watcher = New-Object System.IO.FileSystemWatcher
$watcher.Path                  = $LOG_PATH
$watcher.Filter                = "*.log"
$watcher.NotifyFilter          = [System.IO.NotifyFilters]"LastWrite,FileName"
$watcher.IncludeSubdirectories = $false
$watcher.EnableRaisingEvents   = $true

# 이벤트 등록
$action = {
    param($s, $e)
    Read-NewLines $e.FullPath
}
Register-ObjectEvent $watcher "Changed" -Action $action | Out-Null
Register-ObjectEvent $watcher "Created" -Action $action | Out-Null

Write-Host "[WURI] 대기 중... (Ctrl+C로 종료)"
while ($true) { Start-Sleep -Seconds 1 }
