$ErrorActionPreference = "Stop"

$sdkRoot = if ($env:ANDROID_SDK_ROOT) { $env:ANDROID_SDK_ROOT } elseif ($env:ANDROID_HOME) { $env:ANDROID_HOME } else { Join-Path $env:LOCALAPPDATA "Android\Sdk" }
$env:ANDROID_HOME = $sdkRoot
$env:ANDROID_SDK_ROOT = $sdkRoot
$toolPath = if ($env:AKHYLES_ANDROID_TOOL_PATH) { $env:AKHYLES_ANDROID_TOOL_PATH } else { Join-Path $env:USERPROFILE ".local\akhyles-android" }
if (!$env:JAVA_HOME) {
  $jdk = Get-ChildItem -LiteralPath (Join-Path $toolPath "java") -Directory | Select-Object -First 1
  if (!$jdk) { throw "No se encontró el JDK local de Akhyles." }
  $env:JAVA_HOME = $jdk.FullName
}
$adb = Join-Path $sdkRoot "platform-tools\adb.exe"
$emulator = Join-Path $sdkRoot "emulator\emulator.exe"
$avd = if ($env:AKHYLES_QA_AVD) { $env:AKHYLES_QA_AVD } else { "GymBuddy_API36" }

if (!(Test-Path -LiteralPath $adb)) { throw "No se encontró adb en $adb" }
if (!(Test-Path -LiteralPath $emulator)) { throw "No se encontró el emulador Android en $emulator" }

$device = (& $adb devices | Select-String "^emulator-\d+\s+device$")
if (!$device) {
  Start-Process -FilePath $emulator -ArgumentList @("-avd", $avd, "-no-snapshot-save")
  & $adb wait-for-device
  $deadline = (Get-Date).AddMinutes(2)
  do {
    $booted = (& $adb shell getprop sys.boot_completed 2>$null).Trim()
    if ($booted -eq "1") { break }
    Start-Sleep -Seconds 2
  } while ((Get-Date) -lt $deadline)
  if ($booted -ne "1") { throw "El emulador no terminó de iniciar." }
}

$env:EXPO_PUBLIC_VISUAL_QA = "1"
$env:EXPO_PUBLIC_ACCOUNT_URL = "https://api.akhyles.com"
$env:EXPO_PUBLIC_COMMUNITY_URL = "https://api.akhyles.com/community"

# A release APK and a debug APK use different signing keys. If a release is
# currently installed on the QA emulator, remove only that local installation;
# the synthetic profile is recreated automatically by the development build.
$debugApk = Join-Path $PSScriptRoot "..\android\app\build\outputs\apk\debug\app-debug.apk"
if (Test-Path -LiteralPath $debugApk) {
  $previousErrorPreference = $ErrorActionPreference
  $ErrorActionPreference = "Continue"
  $installOutput = (& $adb install -r -d --user 0 $debugApk 2>&1 | Out-String)
  $installExitCode = $LASTEXITCODE
  $ErrorActionPreference = $previousErrorPreference
  if ($installExitCode -ne 0 -and $installOutput -match "INSTALL_FAILED_UPDATE_INCOMPATIBLE") {
    & $adb uninstall com.javiermartinrosado.akhyles | Out-Null
  } elseif ($installExitCode -ne 0) {
    throw $installOutput.Trim()
  }
}
& npx.cmd expo run:android
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
