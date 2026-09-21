# Re-encode a video with Windows' built-in Media Foundation H.264 encoder (no downloads).
# Usage: powershell -ExecutionPolicy Bypass -File transcode.ps1 -In <src.mp4> -OutDir <dir> -Name <out.mp4> -Width 1920 -Height 1080 -Bitrate 3000000 [-TrimStart 0.1] [-StopAt 19.3]
# The output has its index at the end; run faststart.js on it before publishing.
param(
  [string]$In, [string]$OutDir, [string]$Name,
  [int]$Width = 1920, [int]$Height = 1080, [int]$Bitrate = 3000000,
  [double]$TrimStart = 0, [double]$StopAt = 0   # keep only TrimStart..StopAt (seconds; StopAt is absolute)
)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Runtime.WindowsRuntime

# The Windows storage API only takes absolute paths.
$In = (Resolve-Path -LiteralPath $In).Path
$OutDir = (Resolve-Path -LiteralPath $OutDir).Path

$asTaskOp = [System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object {
  $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1' } | Select-Object -First 1
$asTaskProgress = [System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object {
  $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncActionWithProgress`1' } | Select-Object -First 1

function Await($op, [Type]$type) {
  $t = $asTaskOp.MakeGenericMethod($type).Invoke($null, @($op))
  $t.Wait(-1) | Out-Null
  $t.Result
}

[Windows.Storage.StorageFile, Windows.Storage, ContentType = WindowsRuntime] | Out-Null
[Windows.Storage.StorageFolder, Windows.Storage, ContentType = WindowsRuntime] | Out-Null
[Windows.Media.Transcoding.MediaTranscoder, Windows.Media.Transcoding, ContentType = WindowsRuntime] | Out-Null
[Windows.Media.MediaProperties.MediaEncodingProfile, Windows.Media.MediaProperties, ContentType = WindowsRuntime] | Out-Null

$src = Await ([Windows.Storage.StorageFile]::GetFileFromPathAsync($In)) ([Windows.Storage.StorageFile])
$folder = Await ([Windows.Storage.StorageFolder]::GetFolderFromPathAsync($OutDir)) ([Windows.Storage.StorageFolder])
$dst = Await ($folder.CreateFileAsync($Name, [Windows.Storage.CreationCollisionOption]::ReplaceExisting)) ([Windows.Storage.StorageFile])

$profile = [Windows.Media.MediaProperties.MediaEncodingProfile]::CreateMp4([Windows.Media.MediaProperties.VideoEncodingQuality]::HD1080p)
$profile.Audio = $null                      # a muted hero never plays sound, so drop the track
$profile.Video.Width = $Width
$profile.Video.Height = $Height
$profile.Video.Bitrate = $Bitrate
$profile.Video.FrameRate.Numerator = 30
$profile.Video.FrameRate.Denominator = 1
$profile.Video.ProfileId = [Windows.Media.MediaProperties.H264ProfileIds]::High

$transcoder = New-Object Windows.Media.Transcoding.MediaTranscoder
$transcoder.AlwaysReencode = $true
$transcoder.HardwareAccelerationEnabled = $true
if ($TrimStart -gt 0) { $transcoder.TrimStartTime = [TimeSpan]::FromSeconds($TrimStart) }
# TrimStopTime behaves as an absolute stop position here, despite the docs.
if ($StopAt -gt 0) { $transcoder.TrimStopTime = [TimeSpan]::FromSeconds($StopAt) }

$prep = Await ($transcoder.PrepareFileTranscodeAsync($src, $dst, $profile)) ([Windows.Media.Transcoding.PrepareTranscodeResult])
if (-not $prep.CanTranscode) { throw "Cannot transcode: $($prep.FailureReason)" }

$sw = [Diagnostics.Stopwatch]::StartNew()
$task = $asTaskProgress.MakeGenericMethod([double]).Invoke($null, @($prep.TranscodeAsync()))
$task.Wait(-1) | Out-Null
$sw.Stop()

$outPath = Join-Path $OutDir $Name
$size = (Get-Item $outPath).Length
"{0}: {1}x{2} @ {3:N1} Mbps -> {4:N2} MB in {5:N1}s" -f $Name, $Width, $Height, ($Bitrate / 1e6), ($size / 1MB), $sw.Elapsed.TotalSeconds
