$ErrorActionPreference = 'Stop'
$project = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
$server = Join-Path $project 'server-php'
$destination = Join-Path $project ('artifacts\accounts\akhyles-accounts-' + (Get-Date -Format 'yyyyMMdd-HHmmss'))
New-Item -ItemType Directory -Force -Path $destination | Out-Null
# Explicit allowlist: no local config, test endpoints, backups or user data.
foreach ($item in @('public','src','bin','vendor','bootstrap.php','schema.sql','.htaccess','composer.json','composer.lock','config.example.php','README.md')) {
    Copy-Item -LiteralPath (Join-Path $server $item) -Destination $destination -Recurse
}
if (Test-Path -LiteralPath (Join-Path $destination 'config.local.php')) { throw 'Private configuration must not be packaged.' }
$archive = $destination + '.zip'
# IONOS extracts ZIP entries as POSIX paths. Compress-Archive emits Windows
# backslashes, which makes nested files appear as literal filenames there.
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip = [System.IO.Compression.ZipFile]::Open($archive, [System.IO.Compression.ZipArchiveMode]::Create)
try {
    Get-ChildItem -LiteralPath $destination -File -Recurse | ForEach-Object {
        $relative = $_.FullName.Substring($destination.Length + 1).Replace('\', '/')
        [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile(
            $zip, $_.FullName, ((Split-Path -Leaf $destination) + '/' + $relative),
            [System.IO.Compression.CompressionLevel]::Optimal
        ) | Out-Null
    }
} finally { $zip.Dispose() }
Get-FileHash -LiteralPath $archive -Algorithm SHA256
