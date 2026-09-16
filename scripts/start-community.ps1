$ErrorActionPreference = 'Stop'
$projectPath = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
$env:Path = [Environment]::GetEnvironmentVariable('Path', 'User') + ';' + $env:Path
$apiPort = if ($env:GYM_API_PORT) { [int]$env:GYM_API_PORT } else { 8082 }
$apiListener = Get-NetTCPConnection -LocalPort $apiPort -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
if ($apiListener) {
    $apiProcess = Get-CimInstance Win32_Process -Filter "ProcessId = $($apiListener.OwningProcess)"
    if (-not ($apiProcess.Name -eq 'node.exe' -and $apiProcess.CommandLine.Contains($projectPath) -and $apiProcess.CommandLine.Contains('server'))) {
        throw "Otra aplicacion esta utilizando el puerto $apiPort de Comunidad."
    }
} else {
    $nodePath = (Get-Command node.exe).Source
    $entryPath = Join-Path $projectPath 'server\index.ts'
    Start-Process -FilePath $nodePath -ArgumentList @('--import', 'tsx', ('"' + $entryPath + '"')) -WorkingDirectory $projectPath -WindowStyle Hidden
}
$communityReady = $false
for ($attempt = 0; $attempt -lt 20; $attempt++) {
    try {
        $health = Invoke-RestMethod -Uri "http://127.0.0.1:$apiPort/health" -TimeoutSec 2
        if ($health.service -eq 'akhyles-community') { $communityReady = $true; break }
    } catch { Start-Sleep -Milliseconds 250 }
}
if (-not $communityReady) { throw 'Comunidad no ha arrancado. Ejecuta npm.cmd run server para ver el error.' }
Write-Host "Comunidad disponible en el puerto $apiPort."
