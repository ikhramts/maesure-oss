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
iex "npm run build:staging"

# Deploy.
# We will do a gradual deployment and will test every gsutil
# funcitonality before committing to replacing the production files.
$bucket = "gs://taposcope-web-prod"
$publishDir = "$bucket/dashboard-staging"
$initialUploadDir = "$bucket/dashboard-staging-initial-upload"

iex "gsutil -m rsync -d -r $distPath $initialUploadDir"

# Fix mime type for woff2 files
iex "gsutil -m setmeta -h ""Content-Type:font/woff2"" $initialUploadDir/**.woff2"

iex "gsutil -m cp -r $initialUploadDir $publishDir"
iex "gsutil -m rsync -d -r $initialUploadDir $publishDir"
