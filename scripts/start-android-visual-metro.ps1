$ErrorActionPreference = "Stop"

# Reuses the installed debug client for rapid visual iteration. Native changes
# still go through android:visual; ordinary animation/UI checks only restart Metro.
$env:EXPO_PUBLIC_VISUAL_QA = "1"
$env:EXPO_PUBLIC_ACCOUNT_URL = "https://api.akhyles.com"
$env:EXPO_PUBLIC_COMMUNITY_URL = "https://api.akhyles.com/community"

& npx.cmd expo start --dev-client --port 8081
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
