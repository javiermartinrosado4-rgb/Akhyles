param(
  [string]$Destination = (Join-Path $PSScriptRoot '..\artifacts\website-backup')
)

$ErrorActionPreference = 'Stop'
$baseUrl = 'https://www.akhyles.com'
$pages = @(
  '/',
  '/sobre-akhyles/',
  '/servicios/',
  '/contacto/',
  '/aviso-legal/',
  '/politica-de-privacidad/'
)
$timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
New-Item -ItemType Directory -Force -Path $Destination | Out-Null
$captureRoot = Join-Path (Resolve-Path $Destination) $timestamp
$pageRoot = Join-Path $captureRoot 'pages'
$assetRoot = Join-Path $captureRoot 'assets'
New-Item -ItemType Directory -Force -Path $pageRoot, $assetRoot | Out-Null

$resources = [System.Collections.Generic.HashSet[string]]::new([System.StringComparer]::OrdinalIgnoreCase)
$records = @()
foreach ($path in $pages) {
  $response = Invoke-WebRequest -Uri "$baseUrl$path" -UseBasicParsing
  $name = if ($path -eq '/') { 'index.html' } else { ($path.Trim('/') + '.html') }
  $output = Join-Path $pageRoot $name
  [System.IO.File]::WriteAllText($output, $response.Content, [System.Text.UTF8Encoding]::new($false))
  $records += [pscustomobject]@{ kind = 'page'; url = "$baseUrl$path"; file = "pages/$name"; status = $response.StatusCode }

  [regex]::Matches($response.Content, '(?i)(?:src|href)=["''](https://www\.akhyles\.com/[^"''#?]+)') |
    ForEach-Object { [void]$resources.Add($_.Groups[1].Value) }
}

$downloadedAssets = 0
foreach ($url in $resources | Sort-Object) {
  if ($downloadedAssets -ge 250) { break }
  $relative = $url.Substring($baseUrl.Length).TrimStart('/')
  if ([string]::IsNullOrWhiteSpace($relative)) { continue }
  $target = Join-Path $assetRoot ($relative -replace '/', '\\')
  $targetDirectory = Split-Path -Parent $target
  New-Item -ItemType Directory -Force -Path $targetDirectory | Out-Null
  try {
    Invoke-WebRequest -Uri $url -OutFile $target -UseBasicParsing
    $records += [pscustomobject]@{ kind = 'asset'; url = $url; file = ('assets/' + $relative); status = 200 }
    $downloadedAssets++
  } catch {
    $records += [pscustomobject]@{ kind = 'asset'; url = $url; file = ('assets/' + $relative); status = 'failed' }
  }
}

$manifest = [pscustomobject]@{
  capturedAt = (Get-Date).ToUniversalTime().ToString('o')
  source = $baseUrl
  note = 'Copia de recuperación pública. No modifica ni sustituye el sitio publicado.'
  records = $records
}
$manifest | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath (Join-Path $captureRoot 'manifest.json') -Encoding utf8
Write-Output $captureRoot
