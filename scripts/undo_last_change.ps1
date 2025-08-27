Param(
  [switch]$LocalOnly  # set to drop last local commit if it wasn't pushed
)
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# Require clean working tree
if ((git status --porcelain).Trim()) {
  Write-Error "Working tree not clean. Commit/stash before undo."; exit 1
}

$branch = (git rev-parse --abbrev-ref HEAD).Trim()
if ($branch -eq "HEAD") { Write-Error "Detached HEAD; checkout a branch first."; exit 1 }

if ($LocalOnly) {
  git reset --hard HEAD~1
  if ($LASTEXITCODE -ne 0) { Write-Error "git reset failed."; exit 1 }
  Write-Host "Local undo complete (reset to previous commit)." -ForegroundColor Green
  exit 0
}

git revert --no-edit HEAD
if ($LASTEXITCODE -ne 0) {
  Write-Warning "Revert hit conflicts. Aborting to keep repo unchanged."
  git revert --abort | Out-Null
  exit 1
}
git push
if ($LASTEXITCODE -ne 0) { Write-Error "git push failed."; exit 1 }
Write-Host "Reverted last commit and pushed." -ForegroundColor Green
