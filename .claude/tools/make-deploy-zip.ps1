# Builds deploy/zacs-hills-estate-website.zip: index.html + assets/ only, index.html at the zip root,
# forward-slash entry paths (PowerShell 5's Compress-Archive writes backslashes, which some Linux hosts
# extract as literal file names). Dev files (.claude/, README.md, deploy/) are left out.
# Usage (from the project folder): powershell -ExecutionPolicy Bypass -File .claude/tools/make-deploy-zip.ps1
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression, System.IO.Compression.FileSystem

$root = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$outDir = Join-Path $root 'deploy'
New-Item -ItemType Directory -Force $outDir | Out-Null
$zipPath = Join-Path $outDir 'zacs-hills-estate-website.zip'
if (Test-Path $zipPath) { Remove-Item $zipPath -Force -Confirm:$false }

# Already-compressed formats are stored as they are; text is deflated.
$stored = @('.mp4', '.webp', '.jpg', '.jpeg', '.png', '.woff2')
$files = @(Get-Item (Join-Path $root 'index.html')) + @(Get-ChildItem (Join-Path $root 'assets') -Recurse -File | Sort-Object FullName)

$zip = [System.IO.Compression.ZipFile]::Open($zipPath, [System.IO.Compression.ZipArchiveMode]::Create)
try {
  foreach ($f in $files) {
    $entry = $f.FullName.Substring($root.Length).TrimStart('\').Replace('\', '/')
    $level = if ($stored -contains $f.Extension.ToLower()) { [System.IO.Compression.CompressionLevel]::NoCompression } else { [System.IO.Compression.CompressionLevel]::Optimal }
    [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $f.FullName, $entry, $level) | Out-Null
  }
} finally { $zip.Dispose() }

"{0} files -> {1} ({2:N1} MB)" -f $files.Count, $zipPath, ((Get-Item $zipPath).Length / 1MB)
