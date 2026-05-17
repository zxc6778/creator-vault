# 一键迁移到 zxc6778 账号：登录 → 建库 → 推送 → 开启 Pages
# 用法：
#   .\scripts\migrate-to-zxc6778.ps1
# 或带 Token（在 https://github.com/settings/tokens 创建，勾选 repo 权限）：
#   $env:GITHUB_TOKEN = "ghp_xxxx"
#   .\scripts\migrate-to-zxc6778.ps1

param(
  [string]$Owner = "zxc6778",
  [string]$RepoName = "creator-vault"
)

$ErrorActionPreference = "Stop"
$root = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $root

$remote = "https://github.com/$Owner/$RepoName.git"
Write-Host "目标仓库: $remote" -ForegroundColor Cyan

# 1. 登录 GitHub CLI
if ($env:GITHUB_TOKEN) {
  Write-Host "使用环境变量 GITHUB_TOKEN 登录..." -ForegroundColor Cyan
  $env:GITHUB_TOKEN | gh auth login --with-token
} elseif (-not (gh auth status 2>$null)) {
  Write-Host "请在浏览器中用 $Owner 登录 GitHub..." -ForegroundColor Yellow
  gh auth login -h github.com -p https -w -s repo,workflow,read:org
}

$user = gh api user --jq .login
Write-Host "当前 GitHub 账号: $user" -ForegroundColor Green
if ($user -ne $Owner) {
  Write-Warning "当前登录为 $user，不是 $Owner。请 gh auth logout 后重新登录 $Owner。"
}

# 2. 创建仓库（已存在则跳过）
$exists = $false
try {
  gh repo view "$Owner/$RepoName" 2>$null | Out-Null
  $exists = $true
  Write-Host "仓库已存在，跳过创建" -ForegroundColor Yellow
} catch {
  $exists = $false
}
if (-not $exists) {
  Write-Host "创建仓库 $Owner/$RepoName ..." -ForegroundColor Cyan
  gh repo create "$Owner/$RepoName" --public --description "Easy Wallet - TokenCore web wallet"
}

# 3. 设置远程并推送
git remote set-url origin $remote
git push -u origin main --force
git push origin gh-pages --force

# 4. 开启 GitHub Pages
Write-Host "配置 GitHub Pages (gh-pages 分支)..." -ForegroundColor Cyan
gh api -X POST "repos/$Owner/$RepoName/pages" `
  -f build_type=legacy `
  -f "source[branch]=gh-pages" `
  -f "source[path]=/" 2>$null
if ($LASTEXITCODE -ne 0) {
  gh api -X PUT "repos/$Owner/$RepoName/pages" `
    -f build_type=legacy `
    -f "source[branch]=gh-pages" `
    -f "source[path]=/" | Out-Null
}

Write-Host ""
Write-Host "完成！" -ForegroundColor Green
Write-Host "  代码: https://github.com/$Owner/$RepoName"
Write-Host "  演示: https://$Owner.github.io/$RepoName/"
Write-Host ""
Write-Host "若演示 404，请到仓库 Settings → Pages 确认 Source 为 gh-pages。"
