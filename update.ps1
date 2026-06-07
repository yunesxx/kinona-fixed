# سكربت تحديث سريع - بيدعم العربي + بيرفع نسخة الـ Service Worker تلقائياً
# الاستخدام: .\update.ps1

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host ""
Write-Host "===== Kinona Update =====" -ForegroundColor Cyan
Write-Host ""

# عرض التغييرات
git status --short

if((git status --short).Count -eq 0) {
  Write-Host ""
  Write-Host "ما في تغييرات للنشر" -ForegroundColor Yellow
  exit 0
}

Write-Host ""
$msg = Read-Host "وصف التحديث (commit message)"

if ([string]::IsNullOrWhiteSpace($msg)) {
  Write-Host "تم الإلغاء - لازم تكتب وصف" -ForegroundColor Red
  exit 1
}

# === تحديث رقم نسخة الـ Service Worker تلقائياً ===
# عشان المستخدمين يشوفوا بنر "تحديث متاح"
$swPath = "sw.js"
if(Test-Path $swPath) {
  $sw = Get-Content $swPath -Raw -Encoding UTF8
  $timestamp = Get-Date -Format "yyMMdd-HHmm"
  $newVersion = "kinona-$timestamp"
  $sw = $sw -replace "const VERSION = '[^']*';", "const VERSION = '$newVersion';"
  [System.IO.File]::WriteAllText((Resolve-Path $swPath), $sw, [System.Text.UTF8Encoding]::new($false))
  Write-Host "تم رفع نسخة الـ SW إلى: $newVersion" -ForegroundColor Green
}

# حفظ الرسالة بملف UTF-8 (لحل مشكلة العربي)
$tmpFile = [System.IO.Path]::GetTempFileName()
[System.IO.File]::WriteAllText($tmpFile, $msg, [System.Text.UTF8Encoding]::new($false))

git add .
git commit -F $tmpFile
Remove-Item $tmpFile -Force

if ($LASTEXITCODE -eq 0) {
  Write-Host ""
  Write-Host "Pushing to GitHub..." -ForegroundColor Yellow
  git push

  if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "تم النشر بنجاح ✓" -ForegroundColor Green
    Write-Host "Cloudflare بينشر التحديث خلال 30 ثانية" -ForegroundColor Green
    Write-Host "المستخدمين رح يشوفوا بنر 'تحديث متاح' لما يفتحوا الموقع" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "https://kinona-fixed.pages.dev" -ForegroundColor Cyan
  } else {
    Write-Host "فشل الـ push" -ForegroundColor Red
  }
} else {
  Write-Host "ما في تغييرات للـ commit" -ForegroundColor Yellow
}
