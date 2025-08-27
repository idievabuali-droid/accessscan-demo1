Param(
  [string]$PatchPath = "change.patch",
  [switch]$FromClipboard
)
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# 0) Get diff from clipboard if requested
if ($FromClipboard) {
  $clip = Get-Clipboard -Raw
  if ([string]::IsNullOrWhiteSpace($clip)) { Write-Error "Clipboard is empty."; exit 1 }
  Set-Content -Path $PatchPath -Value $clip -NoNewline
}

# 1) Dry-run check (no changes yet)
git apply --check $PatchPath; $ok = ($LASTEXITCODE -eq 0)

# 2) Apply (or try 3-way merge if needed)
if ($ok) {
  git apply $PatchPath
  if ($LASTEXITCODE -ne 0) { Write-Error "git apply failed."; exit 1 }
} else {
  Write-Host "Dry-run failed; trying 3-way merge..." -ForegroundColor Yellow
  git apply --3way $PatchPath
  if ($LASTEXITCODE -ne 0) { Write-Error "3-way apply failed. Resolve conflicts and retry."; exit 1 }
}

# 3) Stage, commit, push
git add -A
git commit -m ("patch: apply {0}" -f (Get-Date -Format o))
if ($LASTEXITCODE -ne 0) { Write-Error "git commit failed (maybe no changes?)."; exit 1 }
git push
if ($LASTEXITCODE -ne 0) { Write-Error "git push failed."; exit 1 }

# 4) Open your live site (set your Production URL once)
$SiteUrl = "https://accessscan-demo1-1a36.vercel.app/"  # TODO: replace with your real URL
$cb = [int][double]::Parse((Get-Date -UFormat %s))      # cache-buster query
Start-Process "$SiteUrl?cb=$cb"
Write-Host "Patch applied, committed, pushed, and site opened." -ForegroundColor Green
