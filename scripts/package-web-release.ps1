param(
  [string]$Source = 'artifacts\web-1.0.9',
  [string]$Destination = 'artifacts\akhyles-web-app-1.0.9-posix.zip'
)

$ErrorActionPreference = 'Stop'
$root = (Resolve-Path -LiteralPath $Source).Path
$out = Join-Path (Resolve-Path -LiteralPath (Split-Path -Parent $Destination)).Path (Split-Path -Leaf $Destination)
if (Test-Path -LiteralPath $out) { throw "El paquete ya existe: $out" }

Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip = [System.IO.Compression.ZipFile]::Open($out, [System.IO.Compression.ZipArchiveMode]::Create)
try {
  Get-ChildItem -LiteralPath $root -File -Recurse | ForEach-Object {
    $relative = $_.FullName.Substring($root.Length + 1).Replace('\', '/')
    [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile(
      $zip, $_.FullName, $relative, [System.IO.Compression.CompressionLevel]::Optimal
    ) | Out-Null
  }
} finally { $zip.Dispose() }

Get-FileHash -LiteralPath $out -Algorithm SHA256
