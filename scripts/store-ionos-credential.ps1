[CmdletBinding()]
param(
    [Parameter(Mandatory)][string]$Target,
    [Parameter(Mandatory)][string]$UserName,
    [switch]$FromClipboard,
    [string]$EncryptedPayload
)

$ErrorActionPreference = 'Stop'
if ($EncryptedPayload) {
    # One-time local bridge for a password entered in the browser. The matching
    # private key is removed immediately after decryption.
    $csp = New-Object Security.Cryptography.CspParameters
    $csp.KeyContainerName = 'AkhylesDeployTransfer'
    $rsa = New-Object Security.Cryptography.RSACryptoServiceProvider(2048, $csp)
    try {
        $password = [Text.Encoding]::UTF8.GetString($rsa.Decrypt([Convert]::FromBase64String($EncryptedPayload), $true))
    } finally {
        $rsa.PersistKeyInCsp = $false
        $rsa.Clear()
    }
} elseif ($FromClipboard) {
    $password = Get-Clipboard -Raw
    if ([string]::IsNullOrWhiteSpace($password)) { throw 'El portapapeles no contiene una contraseña.' }
} else {
    $secure = Read-Host -AsSecureString 'Contraseña SFTP'
    $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
    try { $password = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr) }
    finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr) }
}

if (-not ('AkhylesCredentialWriter' -as [type])) {
    Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public static class AkhylesCredentialWriter {
  [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
  public struct CREDENTIAL {
    public int Flags; public int Type; public string TargetName; public string Comment;
    public System.Runtime.InteropServices.ComTypes.FILETIME LastWritten;
    public int CredentialBlobSize; public IntPtr CredentialBlob; public int Persist;
    public int AttributeCount; public IntPtr Attributes; public string TargetAlias; public string UserName;
  }
  [DllImport("Advapi32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
  public static extern bool CredWrite([In] ref CREDENTIAL credential, int flags);
}
'@
}

$bytes = [Text.Encoding]::Unicode.GetBytes($password)
$blob = [Runtime.InteropServices.Marshal]::AllocHGlobal($bytes.Length)
try {
    [Runtime.InteropServices.Marshal]::Copy($bytes, 0, $blob, $bytes.Length)
    $credential = New-Object AkhylesCredentialWriter+CREDENTIAL
    $credential.Type = 1 # CRED_TYPE_GENERIC
    $credential.TargetName = $Target
    $credential.UserName = $UserName
    $credential.Persist = 2 # CRED_PERSIST_LOCAL_MACHINE
    $credential.CredentialBlob = $blob
    $credential.CredentialBlobSize = $bytes.Length
    if (-not [AkhylesCredentialWriter]::CredWrite([ref]$credential, 0)) {
        throw "No se pudo guardar la credencial '$Target' (Win32 $([Runtime.InteropServices.Marshal]::GetLastWin32Error()))."
    }
} finally {
    for ($i = 0; $i -lt $bytes.Length; $i++) { [Runtime.InteropServices.Marshal]::WriteByte($blob, $i, 0) }
    [Runtime.InteropServices.Marshal]::FreeHGlobal($blob)
    Remove-Variable password -ErrorAction SilentlyContinue
}

Write-Output "Credencial '$Target' guardada en el Administrador de credenciales de Windows."
