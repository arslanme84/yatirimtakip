param(
    [int]$Port = 8080
)

$baseDir = $PSScriptRoot
if (-not $baseDir) { $baseDir = Get-Location }

$dbPath = Join-Path $baseDir "veritabani.json"

# Initialize veritabani.json if missing
if (-not (Test-Path $dbPath)) {
    $initialDb = @{
        pinHash = $null
        pinSet = $false
        transactions = @()
        customRates = @{}
        settings = @{}
    } | ConvertTo-Json -Depth 4
    [System.IO.File]::WriteAllText($dbPath, $initialDb, [System.Text.Encoding]::UTF8)
}

function Get-SHA256Hash([string]$text) {
    if ([string]::IsNullOrEmpty($text)) { return "" }
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($text)
    $sha256 = [System.Security.Cryptography.SHA256]::Create()
    $hashBytes = $sha256.ComputeHash($bytes)
    return -join ($hashBytes | ForEach-Object { "{0:x2}" -f $_ })
}

function Get-Database() {
    try {
        $raw = [System.IO.File]::ReadAllText($dbPath, [System.Text.Encoding]::UTF8)
        return ($raw | ConvertFrom-Json)
    } catch {
        return @{ pinHash = $null; pinSet = $false; transactions = @(); customRates = @{}; settings = @{} }
    }
}

function Save-Database($dbObj) {
    try {
        $json = $dbObj | ConvertTo-Json -Depth 10
        [System.IO.File]::WriteAllText($dbPath, $json, [System.Text.Encoding]::UTF8)
        return $true
    } catch {
        return $false
    }
}

# Local IP determination
$localIP = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { 
    $_.InterfaceAlias -notlike "*Loopback*" -and $_.IPAddress -notlike "169.254*" -and $_.IPAddress -like "192.168.*"
} | Select-Object -First 1).IPAddress

if (-not $localIP) {
    $localIP = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { 
        $_.InterfaceAlias -notlike "*Loopback*" -and $_.IPAddress -notlike "169.254*"
    } | Select-Object -First 1).IPAddress
}

if (-not $localIP) { $localIP = "localhost" }

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "   ALTIN & DOVIZ PORTFOYUM - MOBIL GUVENLI SUNUCU" -ForegroundColor Yellow
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  [+] Bilgisayarinizda hemen acmak icin:" -ForegroundColor Green
Write-Host "      http://localhost:$Port" -ForegroundColor White
Write-Host ""
Write-Host "  [+] TELEFONUNUZDAN ACMANIZ ICIN ADRES (AYNI WI-FI):" -ForegroundColor Green
Write-Host "      http://${localIP}:$Port" -ForegroundColor Yellow -BackgroundColor Black
Write-Host ""
Write-Host "  [*] Veritabani Dosyasi: veritabani.json (Bilgisayarinizda saklanir)" -ForegroundColor Cyan
Write-Host "  Sunucuyu durdurmak icin bu siyah pencereyi kapatabilirsiniz." -ForegroundColor DarkGray
Write-Host "==========================================================" -ForegroundColor Cyan

# Open in default browser automatically
Start-Process "http://localhost:$Port"

$mimeTypes = @{
    ".html" = "text/html; charset=utf-8"
    ".css"  = "text/css; charset=utf-8"
    ".js"   = "application/javascript; charset=utf-8"
    ".json" = "application/json; charset=utf-8"
    ".png"  = "image/png"
    ".jpg"  = "image/jpeg"
    ".svg"  = "image/svg+xml"
    ".ico"  = "image/x-icon"
}

$listener = New-Object System.Net.Sockets.TcpListener([System.Net.IPAddress]::Any, $Port)

try {
    $listener.Start()
} catch {
    Write-Host "Port $Port mesgul, Port $($Port + 1) deneniyor..." -ForegroundColor Red
    $Port = $Port + 1
    $listener = New-Object System.Net.Sockets.TcpListener([System.Net.IPAddress]::Any, $Port)
    $listener.Start()
}

Write-Host "[*] Guvenli sunucu aktif, istekler dinleniyor (Port: $Port)..." -ForegroundColor Green

while ($true) {
    try {
        $client = $listener.AcceptTcpClient()
        $stream = $client.GetStream()
        $reader = New-Object System.IO.StreamReader($stream, [System.Text.Encoding]::UTF8)

        $requestLine = $reader.ReadLine()
        if (-not [string]::IsNullOrEmpty($requestLine)) {
            $tokens = $requestLine.Split(' ')
            $httpMethod = $tokens[0].ToUpper()
            $rawUrl = if ($tokens.Length -ge 2) { $tokens[1] } else { "/" }

            # Read headers
            $contentLength = 0
            $headerLine = $reader.ReadLine()
            while (-not [string]::IsNullOrWhiteSpace($headerLine)) {
                if ($headerLine -match "^Content-Length:\s*(\d+)") {
                    $contentLength = [int]$matches[1]
                }
                $headerLine = $reader.ReadLine()
            }

            # Read Body if POST/PUT
            $body = ""
            if ($contentLength -gt 0) {
                $buffer = New-Object char[] $contentLength
                $readCount = 0
                while ($readCount -lt $contentLength) {
                    $read = $reader.Read($buffer, $readCount, $contentLength - $readCount)
                    if ($read -le 0) { break }
                    $readCount += $read
                }
                $body = New-Object string ($buffer, 0, $readCount)
            }

            # Handle CORS OPTIONS
            if ($httpMethod -eq "OPTIONS") {
                $corsHeader = "HTTP/1.1 204 No Content`r`nAccess-Control-Allow-Origin: *`r`nAccess-Control-Allow-Methods: GET, POST, OPTIONS`r`nAccess-Control-Allow-Headers: Content-Type`r`nConnection: close`r`n`r`n"
                $hBytes = [System.Text.Encoding]::ASCII.GetBytes($corsHeader)
                $stream.Write($hBytes, 0, $hBytes.Length)
                $stream.Flush()
                $client.Close()
                continue
            }

            # Parse clean path
            $cleanPath = $rawUrl.Split('?')[0]

            # ---------------------------
            # API ROUTING
            # ---------------------------
            if ($cleanPath.StartsWith("/api/")) {
                $resData = @{ success = $false; message = "Bilinmeyen API istegi" }

                $db = Get-Database

                if ($cleanPath -eq "/api/status") {
                    $hasPin = -not [string]::IsNullOrWhiteSpace($db.pinHash)
                    $txCount = if ($db.transactions) { @($db.transactions).Count } else { 0 }
                    $resData = @{
                        success = $true
                        pinSet = $hasPin
                        transactionCount = $txCount
                    }
                }
                elseif ($cleanPath -eq "/api/setup-pin" -and $httpMethod -eq "POST") {
                    $reqObj = $body | ConvertFrom-Json
                    if ($reqObj.pin -and $reqObj.pin.ToString().Length -ge 4) {
                        $db.pinHash = Get-SHA256Hash ($reqObj.pin.ToString())
                        $db.pinSet = $true
                        Save-Database $db | Out-Null
                        $resData = @{ success = $true; message = "PIN basariyla olusturuldu" }
                    } else {
                        $resData = @{ success = $false; message = "PIN en az 4 haneli olmalidir" }
                    }
                }
                elseif ($cleanPath -eq "/api/verify-pin" -and $httpMethod -eq "POST") {
                    $reqObj = $body | ConvertFrom-Json
                    $inputHash = Get-SHA256Hash ($reqObj.pin.ToString())
                    if ($inputHash -eq $db.pinHash) {
                        $resData = @{
                            success = $true
                            message = "Giris basarili"
                            data = @{
                                transactions = $db.transactions
                                customRates = $db.customRates
                                settings = $db.settings
                            }
                        }
                    } else {
                        $resData = @{ success = $false; message = "Hatali PIN kodu, tekrar deneyin" }
                    }
                }
                elseif ($cleanPath -eq "/api/save-data" -and $httpMethod -eq "POST") {
                    $reqObj = $body | ConvertFrom-Json
                    $inputHash = Get-SHA256Hash ($reqObj.pin.ToString())
                    if ($inputHash -eq $db.pinHash -or (-not $db.pinSet)) {
                        if ($reqObj.transactions) { $db.transactions = $reqObj.transactions }
                        if ($reqObj.customRates) { $db.customRates = $reqObj.customRates }
                        if ($reqObj.settings) { $db.settings = $reqObj.settings }
                        Save-Database $db | Out-Null
                        $resData = @{ success = $true; message = "Veriler bilgisayara kaydedildi" }
                    } else {
                        $resData = @{ success = $false; message = "Yetkisiz islem: Hatali PIN" }
                    }
                }
                elseif ($cleanPath -eq "/api/change-pin" -and $httpMethod -eq "POST") {
                    $reqObj = $body | ConvertFrom-Json
                    $oldHash = Get-SHA256Hash ($reqObj.oldPin.ToString())
                    if ($oldHash -eq $db.pinHash) {
                        if ($reqObj.newPin -and $reqObj.newPin.ToString().Length -ge 4) {
                            $db.pinHash = Get-SHA256Hash ($reqObj.newPin.ToString())
                            Save-Database $db | Out-Null
                            $resData = @{ success = $true; message = "PIN kodu basariyla degistirildi" }
                        } else {
                            $resData = @{ success = $false; message = "Yeni PIN en az 4 haneli olmalidir" }
                        }
                    } else {
                        $resData = @{ success = $false; message = "Mevcut PIN hatali" }
                    }
                }

                $jsonResponse = $resData | ConvertTo-Json -Depth 10
                $respBytes = [System.Text.Encoding]::UTF8.GetBytes($jsonResponse)
                $apiHeader = "HTTP/1.1 200 OK`r`nContent-Type: application/json; charset=utf-8`r`nContent-Length: $($respBytes.Length)`r`nAccess-Control-Allow-Origin: *`r`nConnection: close`r`n`r`n"
                $hBytes = [System.Text.Encoding]::ASCII.GetBytes($apiHeader)
                $stream.Write($hBytes, 0, $hBytes.Length)
                $stream.Write($respBytes, 0, $respBytes.Length)
                $stream.Flush()
                $client.Close()
                continue
            }

            # ---------------------------
            # STATIC FILE SERVING
            # ---------------------------
            # Normalize path: collapse duplicate slashes and duplicate dots (e.g. index..html -> index.html)
            $cleanPath = $cleanPath -replace '/+', '/'
            $cleanPath = $cleanPath -replace '\.\.+', '.'

            # If root, empty, or requesting any variation of index or HTML page without matching file, map to index.html
            if ($cleanPath -eq "/" -or [string]::IsNullOrWhiteSpace($cleanPath) -or $cleanPath -like "*index*") {
                $cleanPath = "/index.html"
            }

            $filePath = Join-Path $baseDir $cleanPath.TrimStart('/')

            # SPA Fallback: If file doesn't exist but has no ext or .html, serve index.html
            if (-not (Test-Path $filePath -PathType Leaf)) {
                $ext = [System.IO.Path]::GetExtension($cleanPath).ToLower()
                if ($ext -eq ".html" -or $ext -eq "" -or $ext -eq ".htm") {
                    $filePath = Join-Path $baseDir "index.html"
                }
            }

            if (Test-Path $filePath -PathType Leaf) {
                $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
                $mime = $mimeTypes[$ext]
                if (-not $mime) { $mime = "application/octet-stream" }

                $bytes = [System.IO.File]::ReadAllBytes($filePath)
                $header = "HTTP/1.1 200 OK`r`nContent-Type: $mime`r`nContent-Length: $($bytes.Length)`r`nAccess-Control-Allow-Origin: *`r`nConnection: close`r`n`r`n"
                $headerBytes = [System.Text.Encoding]::ASCII.GetBytes($header)
                $stream.Write($headerBytes, 0, $headerBytes.Length)
                $stream.Write($bytes, 0, $bytes.Length)
            } else {
                $msg = "404 - Sayfa Bulunamadi"
                $msgBytes = [System.Text.Encoding]::UTF8.GetBytes($msg)
                $header = "HTTP/1.1 404 Not Found`r`nContent-Type: text/plain; charset=utf-8`r`nContent-Length: $($msgBytes.Length)`r`nConnection: close`r`n`r`n"
                $headerBytes = [System.Text.Encoding]::ASCII.GetBytes($header)
                $stream.Write($headerBytes, 0, $headerBytes.Length)
                $stream.Write($msgBytes, 0, $msgBytes.Length)
            }
        }
        $stream.Flush()
        $client.Close()
    } catch {
        # ignore disconnected client errors
    }
}
