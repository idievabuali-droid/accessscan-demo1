$ts = Get-Date -Format 'yyyy-MM-dd_HH-mm-ss'
$dir = Join-Path -Path 'backups' -ChildPath "important-files-$ts"
New-Item -ItemType Directory -Force -Path $dir | Out-Null
Write-Output "Created backup dir: $dir"
$files = @(
  'index.html','package.json','package-lock.json','playwright.config.js',
  'guide-me-button.spec.js','quick-tests.spec.js','pdf-parity.spec.js','force-states.spec.js','remaining-tests.spec.js','force-remaining.spec.js','QUICK_TESTS_REPORT.md',
  'scripts/AccessScan_Quick_Tests_Collection.txt','scripts/AccessScan_Quick_Tests_All_In_One.txt','scripts/extract_pdfs.py','scripts/dump_page.js','scripts/page_dump.html','scripts/page_text.txt'
)
foreach ($f in $files) {
  if (Test-Path $f) {
    Copy-Item -Path $f -Destination $dir -Force -ErrorAction SilentlyContinue
    Write-Output "Copied: $f"
  } else {
    Write-Output "Not found: $f"
  }
}
# Add backup folder to git and commit
Set-Location -LiteralPath (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location -LiteralPath '..\'
git add $dir
if ((git status --porcelain) -ne '') {
  git commit -m "chore: backup important files snapshot $ts"
  try { git push } catch { git push --set-upstream origin HEAD }
  Write-Output "Backed up to $dir and pushed."
} else {
  Write-Output 'No changes to commit (backup folder empty or already tracked)'
}
