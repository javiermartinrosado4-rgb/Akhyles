[CmdletBinding()]
param(
    [Parameter(Mandatory)]
    [ValidateSet('Web', 'Api')]
    [string]$Target,
    [string]$Config,
    [string]$WebSource = 'dist',
    [string[]]$ApiFiles = @('schema.sql', 'src/Accounts.php', 'src/Community.php'),
    [switch]$Deploy,
    [switch]$TestConnection,
    [switch]$Diagnostics
)

$ErrorActionPreference = 'Stop'
$project = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
if (-not $Config) { $Config = Join-Path $project ('.private\ionos-deploy.' + $Target.ToLowerInvariant() + '.json') }
if ($Deploy -and $TestConnection) { throw 'Usa -TestConnection o -Deploy, no ambos a la vez.' }

function Require-Value([object]$Value, [string]$Name) {
    if ([string]::IsNullOrWhiteSpace([string]$Value)) { throw "Falta '$Name' en $Config." }
}

function Join-RemotePath([string]$Root, [string]$Child) {
    $base = $Root.Replace('\', '/').TrimEnd('/')
    if ([string]::IsNullOrWhiteSpace($base)) { $base = '/' }
    $suffix = $Child.Replace('\', '/').TrimStart('/')
    if ($base -eq '/') { return '/' + $suffix }
    return $base + '/' + $suffix
}

function Quote-Sftp([string]$Value) {
    if ($Value.Contains('"')) { throw "La ruta contiene comillas no admitidas: $Value" }
    return '"' + $Value.Replace('\', '/') + '"'
}

function Get-GenericCredentialSecret([string]$TargetName) {
    if (-not ('AkhylesCredMan' -as [type])) {
        Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public static class AkhylesCredMan {
  [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
  public struct CREDENTIAL {
    public int Flags; public int Type; public string TargetName; public string Comment;
    public System.Runtime.InteropServices.ComTypes.FILETIME LastWritten; public int CredentialBlobSize; public IntPtr CredentialBlob;
    public int Persist; public int AttributeCount; public IntPtr Attributes; public string TargetAlias; public string UserName;
  }
  [DllImport("Advapi32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
  public static extern bool CredRead(string target, int type, int flags, out IntPtr credentialPtr);
  [DllImport("Advapi32.dll", SetLastError = true)]
  public static extern void CredFree(IntPtr buffer);
}
'@
    }
    $pointer = [IntPtr]::Zero
    if (-not [AkhylesCredMan]::CredRead($TargetName, 1, 0, [ref]$pointer)) {
        throw "No existe la credencial segura '$TargetName' en el Administrador de credenciales de Windows."
    }
    try {
        $credential = [Runtime.InteropServices.Marshal]::PtrToStructure($pointer, [type][AkhylesCredMan+CREDENTIAL])
        if ($credential.CredentialBlobSize -le 0) { throw "La credencial '$TargetName' no contiene una contraseña." }
        $bytes = New-Object byte[] $credential.CredentialBlobSize
        [Runtime.InteropServices.Marshal]::Copy($credential.CredentialBlob, $bytes, 0, $bytes.Length)
        return [Text.Encoding]::Unicode.GetString($bytes).TrimEnd([char]0)
    } finally {
        if ($pointer -ne [IntPtr]::Zero) { [AkhylesCredMan]::CredFree($pointer) }
    }
}

if (-not (Test-Path -LiteralPath $Config)) { throw "No existe la configuración privada: $Config" }
$settings = Get-Content -LiteralPath $Config -Raw | ConvertFrom-Json
foreach ($name in @('host', 'port', 'user', 'remoteRoot', 'knownHostsFile', 'verifyUrl')) { Require-Value $settings.$name $name }
$knownHosts = [Environment]::ExpandEnvironmentVariables([string]$settings.knownHostsFile)
if (-not (Test-Path -LiteralPath $knownHosts)) { throw "No se encuentra known_hosts: $knownHosts. No se acepta una clave de servidor sin verificar." }

$transfers = [System.Collections.Generic.List[object]]::new()
if ($Target -eq 'Web') {
    $source = Join-Path $project $WebSource
    if (-not (Test-Path -LiteralPath $source -PathType Container)) { throw "No existe el export web: $source" }
    $files = Get-ChildItem -LiteralPath $source -File -Force -Recurse | ForEach-Object {
        [PSCustomObject]@{ Source = $_.FullName; Relative = $_.FullName.Substring($source.Length + 1).Replace('\', '/') }
    }
    # index.html switches the active Expo bundle; transfer it strictly last.
    $late = @('metadata.json', 'index.html')
    $files = @($files | Where-Object { $late -notcontains $_.Relative } | Sort-Object Relative) + @($files | Where-Object { $late -contains $_.Relative } | Sort-Object { [array]::IndexOf($late, $_.Relative) })
    foreach ($file in $files) { $transfers.Add([PSCustomObject]@{ Source = $file.Source; Remote = Join-RemotePath $settings.remoteRoot $file.Relative }) }
} else {
    $allowed = @('schema.sql', 'src/Accounts.php', 'src/Community.php')
    foreach ($relative in $ApiFiles) {
        if ($allowed -notcontains $relative) { throw "Archivo de API no permitido: $relative" }
        $source = Join-Path $project ('server-php\' + $relative)
        if (-not (Test-Path -LiteralPath $source -PathType Leaf)) { throw "No existe: $source" }
        $transfers.Add([PSCustomObject]@{ Source = $source; Remote = Join-RemotePath $settings.remoteRoot $relative })
    }
}

$manifest = $transfers | ForEach-Object { "{0} -> {1}" -f $_.Source.Substring($project.Length + 1), $_.Remote }
if (-not $Deploy -and -not $TestConnection) {
    Write-Output "Simulación ${Target}: $($transfers.Count) archivos. Usa -Deploy para transferir."
    $manifest
    exit 0
}

if ($Deploy) {
    # Hard deployment gate: production transfer is impossible until the exact
    # target, credential and host key have passed a fresh read-only SFTP check.
    # This child invocation never receives -Deploy, so recursion cannot occur.
    Write-Output "Preflight obligatorio ${Target}: comprobando SFTP sin modificar el servidor..."
    $preflightArgs = @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', $PSCommandPath, '-Target', $Target, '-Config', $Config, '-TestConnection')
    & powershell.exe @preflightArgs
    if ($LASTEXITCODE -ne 0) {
        throw 'Publicación bloqueada: la comprobación SFTP obligatoria no ha superado la autenticación. No se ha transferido ningún archivo.'
    }
    Write-Output 'Preflight superado. Iniciando transferencia permitida.'
}

$askPass = [IO.Path]::ChangeExtension([IO.Path]::GetTempFileName(), '.cmd')
try {
    $commands = [System.Collections.Generic.List[string]]::new()
    if ($TestConnection) {
        # Read-only authentication test: it never changes remote files.
        $commands.Add('pwd')
        $commands.Add('ls')
    } else {
        $directories = $transfers | ForEach-Object { Split-Path $_.Remote.Replace('/', '\') -Parent } | Where-Object { $_ -and $_ -ne '\' } | Sort-Object -Unique
        foreach ($directory in $directories) { $commands.Add('-mkdir ' + (Quote-Sftp $directory)) }
        foreach ($transfer in $transfers) { $commands.Add('put ' + (Quote-Sftp $transfer.Source) + ' ' + (Quote-Sftp $transfer.Remote)) }
    }
    # sftp -b forces BatchMode=yes, preventing SSH_ASKPASS from providing a
    # protected password. Feed commands through standard input instead.
    $sftpArguments = @('-4', '-P', [string]$settings.port, '-o', 'BatchMode=no', '-o', 'StrictHostKeyChecking=yes', '-o', ('UserKnownHostsFile=' + $knownHosts))
    if ($Diagnostics) { $sftpArguments += '-vvv' }
    if ($settings.identityFile) {
        $identity = [Environment]::ExpandEnvironmentVariables([string]$settings.identityFile)
        if (-not (Test-Path -LiteralPath $identity)) { throw "No se encuentra la clave privada: $identity" }
        $sftpArguments += @('-i', $identity, '-o', 'PasswordAuthentication=no')
    } else {
        Require-Value $settings.credentialTarget 'credentialTarget'
        $password = Get-GenericCredentialSecret $settings.credentialTarget
        # A password may contain CMD metacharacters. Pass only Base64 through
        # the .cmd askpass shim, then decode it in PowerShell, so the exact
        # original characters reach OpenSSH.
        $passwordBase64 = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($password))
        $askPassBody = '@echo off' + [Environment]::NewLine +
            'powershell.exe -NoProfile -NonInteractive -Command "$b=[Convert]::FromBase64String($env:AKHYLES_IONOS_DEPLOY_PASSWORD_B64); [Console]::Out.Write([Text.Encoding]::UTF8.GetString($b))"'
        Set-Content -LiteralPath $askPass -Value $askPassBody -Encoding ascii
        $env:AKHYLES_IONOS_DEPLOY_PASSWORD_B64 = $passwordBase64
        $env:SSH_ASKPASS = $askPass
        $env:SSH_ASKPASS_REQUIRE = 'force'
        $env:DISPLAY = 'akhyles-deploy'
        $sftpArguments += @('-o', 'PreferredAuthentications=password', '-o', 'PubkeyAuthentication=no', '-o', 'NumberOfPasswordPrompts=1')
    }
    $sftpArguments += ($settings.user + '@' + $settings.host)
    $previousErrorActionPreference = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try {
        $output = $commands | & "$env:WINDIR\System32\OpenSSH\sftp.exe" @sftpArguments 2>&1
        $sftpExitCode = $LASTEXITCODE
        # Native stderr becomes ErrorRecord objects in Windows PowerShell even
        # on success (for example, SFTP's "Connected" line). Normalize them
        # to text so a successful validation never looks like a script error.
        $output = @($output | ForEach-Object { [string]$_ })
    } finally {
        $ErrorActionPreference = $previousErrorActionPreference
    }
    if ($sftpExitCode -ne 0) { throw "La conexión SFTP falló.`n$($output -join "`n")" }
    $output | Write-Output
} finally {
    Remove-Item Env:AKHYLES_IONOS_DEPLOY_PASSWORD_B64 -ErrorAction SilentlyContinue
    Remove-Item Env:SSH_ASKPASS -ErrorAction SilentlyContinue
    Remove-Item Env:SSH_ASKPASS_REQUIRE -ErrorAction SilentlyContinue
    Remove-Item Env:DISPLAY -ErrorAction SilentlyContinue
    Remove-Item -LiteralPath $askPass -Force -ErrorAction SilentlyContinue
}

if ($TestConnection) {
    Write-Output "Conexión SFTP $Target verificada sin publicar archivos."
    exit 0
}

$response = Invoke-WebRequest -Uri $settings.verifyUrl -UseBasicParsing -TimeoutSec 30
if ($response.StatusCode -ne 200) { throw "Verificación HTTP fallida: $($response.StatusCode)" }
if ($Target -eq 'Web') {
    $index = Get-Content -LiteralPath (Join-Path (Join-Path $project $WebSource) 'index.html') -Raw
    $entry = [regex]::Match($index, 'entry-[a-f0-9]+\.js').Value
    if (-not $entry -or $response.Content -notmatch [regex]::Escape($entry)) { throw 'La web pública no sirve el bundle recién desplegado.' }
} elseif ($response.Content -notmatch '"ok"\s*:\s*true') {
    throw 'La API no confirmó el estado healthy tras el despliegue.'
}
Write-Output "Despliegue $Target verificado: $($settings.verifyUrl)"
