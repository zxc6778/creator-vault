# Easy Wallet 开发启动脚本
Set-Location $PSScriptRoot\..

Write-Host "Easy Wallet - 启动开发服务器..." -ForegroundColor Cyan
Write-Host "浏览器请打开: http://localhost:5173" -ForegroundColor Green
Write-Host "请勿双击 index.html" -ForegroundColor Yellow

if (-not (Test-Path "node_modules")) {
  npm install
}

npm run dev
