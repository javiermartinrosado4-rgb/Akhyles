param(
  [Parameter(Mandatory = $true)]
  [string]$Source,
  [string]$Destination = ''
)

$ErrorActionPreference = 'Stop'
$scriptDirectory = Split-Path -Parent $PSCommandPath
if ([string]::IsNullOrWhiteSpace($Destination)) {
  $Destination = Join-Path $scriptDirectory '..\artifacts\website-static-stage'
}
$sourceRoot = (Resolve-Path $Source).Path
$pageSource = Join-Path $sourceRoot 'pages'
$assetSource = Join-Path $sourceRoot 'assets'
if (-not (Test-Path -LiteralPath $pageSource) -or -not (Test-Path -LiteralPath $assetSource)) {
  throw 'La fuente debe ser una captura creada por backup-public-website.ps1.'
}

New-Item -ItemType Directory -Force -Path $Destination | Out-Null
$targetRoot = Join-Path (Resolve-Path $Destination) (Split-Path -Leaf $sourceRoot)
New-Item -ItemType Directory -Force -Path $targetRoot | Out-Null
Get-ChildItem -LiteralPath $assetSource -Force | ForEach-Object {
  Copy-Item -LiteralPath $_.FullName -Destination $targetRoot -Recurse -Force
}

$routes = @{
  'index.html' = 'index.html'
  'sobre-akhyles.html' = 'sobre-akhyles\index.html'
  'servicios.html' = 'servicios\index.html'
  'contacto.html' = 'contacto\index.html'
  'aviso-legal.html' = 'aviso-legal\index.html'
  'politica-de-privacidad.html' = 'politica-de-privacidad\index.html'
}

foreach ($entry in $routes.GetEnumerator()) {
  $html = [System.IO.File]::ReadAllText((Join-Path $pageSource $entry.Key))
  # La captura contenía URL absolutas del WordPress gestionado. Al publicarla en
  # el mismo dominio, estas rutas siguen resolviendo contra los recursos copiados.
  $html = $html.Replace('https://www.akhyles.com/', '/')
  $output = Join-Path $targetRoot $entry.Value
  New-Item -ItemType Directory -Force -Path (Split-Path -Parent $output) | Out-Null
  [System.IO.File]::WriteAllText($output, $html, [System.Text.UTF8Encoding]::new($false))
}

@'
Esta carpeta es una previsualización estática recuperable de akhyles.com.
No se ha publicado ni sustituye MyWebsite NOW. El formulario de contacto del
sitio gestionado necesita un destinatario propio antes de publicarse.
'@ | Set-Content -LiteralPath (Join-Path $targetRoot 'README.txt') -Encoding utf8

Write-Output $targetRoot
