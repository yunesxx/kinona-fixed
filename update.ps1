# سكربت تحديث سريع - بيدعم العربي
# الاستخدام: .\update.ps1

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host ""
Write-Host "===== Kinona Update =====" -ForegroundColor Cyan
Write-Host ""

# عرض التغييرات
git status --short

Write-Host ""
$msg = Read-Host "وصف التحديث (commit message)"

if ([string]::IsNullOrWhiteSpace($msg)) {
  Write-Host "تم الإلغاء - لازم تكتب وصف" -ForegroundColor Red
  exit 1
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
    Write-Host "تم النشر بنجاح" -ForegroundColor Green
    Write-Host "Cloudflare بينشر التحديث خلال 30 ثانية" -ForegroundColor Green
    Write-Host "https://kinona-fixed.pages.dev" -ForegroundColor Cyan
  } else {
    Write-Host "فشل الـ push" -ForegroundColor Red
  }
} else {
  Write-Host "ما في تغييرات للـ commit" -ForegroundColor Yellow
}
