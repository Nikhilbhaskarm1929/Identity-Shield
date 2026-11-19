$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir
Set-Location $ProjectRoot

$TailwindCli = Join-Path $ProjectRoot "tools\tailwindcss-windows-x64.exe"
if (-not (Test-Path $TailwindCli)) {
    Write-Error "Tailwind CLI binary not found at $TailwindCli. See tools/README.md"
}

Write-Host "Building minified Tailwind CSS..." -ForegroundColor Cyan
& $TailwindCli -c "$ProjectRoot\tailwind.config.js" -o "$ProjectRoot\static\v3\css\tailwind.css" --minify
Write-Host "Tailwind CSS built successfully: static/v3/css/tailwind.css" -ForegroundColor Green
