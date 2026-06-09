# deploy.ps1 — CSC CMMS deploy script
#
# Increments APP_VERSION in backend/Version.gs, commits the change,
# then runs `clasp push --force` to deploy to Google Apps Script.
#
# Usage (from the project root):
#   .\deploy.ps1
#
# Prerequisites:
#   - clasp installed globally (npm i -g @google/clasp)
#   - clasp already logged in (`clasp login` run at least once)
#   - git is configured for this repo
#
# The script will:
#   1. Read APP_VERSION from backend/Version.gs
#   2. Increment it by 1
#   3. Write the updated file back (UTF-8, no BOM)
#   4. Stage backend/Version.gs
#   5. Commit with message "chore: deploy vN"
#   6. Run clasp push --force
# ─────────────────────────────────────────────────────────────────────────────

$ErrorActionPreference = 'Stop'
$vFile = "backend\Version.gs"

Write-Host ""
Write-Host "CSC CMMS Deploy" -ForegroundColor Cyan
Write-Host "───────────────────────────────────────" -ForegroundColor DarkGray

# ── 1. Verify Version.gs exists ───────────────────────────────────────────────
if (-not (Test-Path $vFile)) {
    Write-Host "ERROR: $vFile not found. Run from the project root." -ForegroundColor Red
    exit 1
}

# ── 2. Read, parse, increment APP_VERSION ────────────────────────────────────
$content = Get-Content $vFile -Raw
if ($content -match 'var APP_VERSION\s*=\s*(\d+);') {
    $current = [int]$Matches[1]
    $next    = $current + 1
    $content = $content -replace 'var APP_VERSION\s*=\s*\d+;', "var APP_VERSION = $next;"
    # Write back as UTF-8 without BOM (required for GAS source compatibility)
    [System.IO.File]::WriteAllText(
        (Resolve-Path $vFile).Path,
        $content,
        [System.Text.UTF8Encoding]::new($false)
    )
    Write-Host "Version bumped: $current  ->  $next" -ForegroundColor Green
} else {
    Write-Host "ERROR: Could not find APP_VERSION in $vFile" -ForegroundColor Red
    exit 1
}

# ── 3. Stage and commit ───────────────────────────────────────────────────────
Write-Host "Committing version bump…" -ForegroundColor DarkGray
git add $vFile
git commit -m "chore: deploy v$next"

# ── 4. Push to Google Apps Script ────────────────────────────────────────────
Write-Host "Pushing to Google Apps Script…" -ForegroundColor DarkGray
clasp push --force

Write-Host ""
Write-Host "Deploy complete — v$next" -ForegroundColor Green
Write-Host ""
