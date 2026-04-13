# Chạy workflow GitHub Actions "Supabase handle-missed-deadlines" và in log nếu lỗi.
# Yêu cầu: GitHub CLI đã cài và đã `gh auth login` (hoặc biến GH_TOKEN).
#
#   .\scripts\run-missed-deadlines-workflow.ps1

# Không dùng Stop toàn cục: lệnh `gh` ghi stderr khi chưa login sẽ làm PowerShell "throw".
$ErrorActionPreference = "Continue"

$env:Path =
  [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" +
  [System.Environment]::GetEnvironmentVariable("Path", "User")

if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
  $candidates = @(
    "$env:ProgramFiles\GitHub CLI\gh.exe",
    "$env:LOCALAPPDATA\Programs\GitHub CLI\gh.exe"
  )
  foreach ($p in $candidates) {
    if (Test-Path $p) {
      $env:Path = "$(Split-Path $p -Parent);$env:Path"
      break
    }
  }
}

if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
  Write-Host "Không tìm thấy gh. Cài GitHub CLI: https://cli.github.com/" -ForegroundColor Red
  exit 1
}

gh auth status 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
  Write-Host "Chưa đăng nhập GitHub CLI. Chạy lệnh sau trong terminal (một lần), làm theo hướng dẫn:" -ForegroundColor Yellow
  Write-Host "  gh auth login -h github.com -p https -w" -ForegroundColor Cyan
  Write-Host "Hoặc dùng token (repo scope): `$env:GH_TOKEN='ghp_...'" -ForegroundColor Cyan
  exit 1
}

Set-Location (Resolve-Path (Join-Path $PSScriptRoot ".."))

Write-Host "Kích hoạt workflow…" -ForegroundColor Cyan
gh workflow run "Supabase handle-missed-deadlines" --ref master
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Start-Sleep -Seconds 6

$json = gh run list --workflow "supabase-handle-missed-deadlines.yml" --limit 1 --json databaseId,status,conclusion,url 2>&1
if ($LASTEXITCODE -ne 0) { Write-Error $json; exit 1 }

$run = ($json | ConvertFrom-Json)[0]
$runId = $run.databaseId
Write-Host "Run: $($run.url)" -ForegroundColor Cyan
Write-Host "Đang chờ kết quả (run watch)…" -ForegroundColor Cyan
gh run watch $runId
$watchExit = $LASTEXITCODE

$conclusion = (gh run view $runId --json conclusion --jq .conclusion 2>&1).Trim()
Write-Host "Kết luận: $conclusion" -ForegroundColor $(if ($conclusion -eq "success") { "Green" } else { "Yellow" })

if ($conclusion -ne "success") {
  Write-Host "`n--- Log các bước lỗi ---" -ForegroundColor Red
  gh run view $runId --log-failed 2>&1
  exit 1
}

if ($watchExit -ne 0) { exit $watchExit }
exit 0
