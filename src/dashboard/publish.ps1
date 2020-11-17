$ErrorActionPreference = "Stop"
function StopOnError() {
    if ($LastExitCode -ne 0) {
        [Environment]::Exit(1)
    }
}

$scriptPath = $PSScriptRoot
$distPath = "$scriptPath\build"

# Rebuild.
if (Test-Path $distPath) {
    Remove-Item -Recurse -Force $distPath
}

#iex "npm install"
iex "npm run build:prod"

# Deploy.
# We will do a gradual deployment and will test every gsutil
# funcitonality before committing to replacing the production files.
$bucket = "gs://taposcope-web-prod"
$prodDir = "$bucket/dashboard"
$stagingDir = "$bucket/dashboard-deployment-staging"
$backupDir = "$bucket/dashboard-backup"

iex "gsutil -m rsync -d -r $distPath $stagingDir"

# Fix mime type for woff2 files
iex "gsutil -m setmeta -h ""Content-Type:font/woff2"" $stagingDir/**.woff2"

iex "gsutil -m rsync -d -r $prodDir $backupDir"
iex "gsutil -m cp -r $stagingDir $prodDir"
iex "gsutil -m rsync -d -r $stagingDir $prodDir"
