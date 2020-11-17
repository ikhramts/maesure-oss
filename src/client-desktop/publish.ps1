$ErrorActionPreference = "Stop"

#----- Calculate the version -----
# Each of the numbers has to be < 65535
$now = Get-Date
$year = $now.Year
$startOfTime = Get-Date -Year 1900 -Month 1 -Day 1 -Hour 0 -Minute 0 -Second 0 -Millisecond 0
$minutesElapsed = [Int32] [math]::floor($now.Subtract($startOfTime).TotalMinutes)
$secondSpot = [Int32] [math]::floor($minutesElapsed / 10000)
$thirdSpot = [Int32] ($minutesElapsed % 10000)
$version = "1.$secondSpot.$thirdSpot"

Write-Host "Publishing version: $version"

#----- Settings -----
$root = $PSScriptRoot
$releaseOutDir = "$root\dist\Release-win32-x64"
$stablePublishUrl = "gs://taposcope-releases/downloads/stable"

#----- Let's go! -----

# Build the webpack app
Write-Host ""
Write-Host ""
Write-Host "===================================================="
Write-Host "              Building JS package"
Write-Host "===================================================="
Write-Host ""

iex "npm run build-prod"

# Copy the release variant of package.json and adjust the version in it. 
$packageJsonSource = "$root/publishing/package.dist.json"
$packageJsonDest = "$root/build/package.json"
((Get-Content -Path $packageJsonSource -Raw) -replace "__VERSION__", $version) | Set-Content $packageJsonDest

function PublishRelease() {
    param([string]$stage)

    # Settings
    if ($stage -eq "Preview") {
        $publishUrl = "gs://taposcope-releases/downloads/preview"
    } elseif ($stage -eq "Stable") {
        # We pre-stage "Stable" into the preview folder.
        # The actual release of "Stable" will copy it from here
        # into /downloads/stable
        $publishUrl = "gs://taposcope-releases/downloads/preview/stable"
    } else {
        throw "Unknown stage: $stage"
    }

    # Let's get started.
    Write-Host ""
    Write-Host ""
    Write-Host ""
    Write-Host "===================================================="
    Write-Host "             Publishing stage $stage "
    Write-Host "===================================================="
    Write-Host ""


    # Generate the distributable package in the /dist folder
    iex "npm run package" # This will also delete dist folder
    iex "node ./publishing/run-squirrel.js"

    Write-Host "Signing..."
    $signtool = "C:\Program Files (x86)\Windows Kits\10\bin\x86\signtool.exe"
    iex "&'$signtool' sign /tr http://timestamp.digicert.com /td sha256 /fd sha256 /a ""$releaseOutDir\Maesure-setup.exe"""
    Write-Host "Done signing"

    # Publish to the downloads GCP bucket
    # We must copy the installers first (*.nupkg, *.exe), and only then update
    # RELEASES file to indicate that the new version is available.

    # While at it, we will set cache instructions for CDNs.
    # Shorter expirations = higher costs (proportional to the file size).
    iex "gsutil -h ""Cache-Control:public,max-age=31556952"" cp $releaseOutDir\*.nupkg $publishUrl" # expires in a year - version is in the file name
    iex "gsutil -h ""Cache-Control:public,max-age=86400"" cp $releaseOutDir\*.exe $publishUrl" # expires in a day; will cause a bit of extra traffic
    iex "gsutil -h ""Cache-Control:public,max-age=60"" cp $releaseOutDir\RELEASES $publishUrl" # expires in every 60 sec

    # Clean up all the old stuff in the target bucket
    iex "gsutil -m rsync -d $releaseOutDir $publishUrl"
}

# Publish the next stable version
PublishRelease -stage "Stable"

# Replace the update check URL in the preview version
$mainProcessBundle = "$root\build\main.bundle.js"
$stableUpdateUrl = "https://static.maesure.com/downloads/stable"
$previewUpdateUrl = "https://static.maesure.com/downloads/preview"
((Get-Content -Path $mainProcessBundle -Raw) -replace $stableUpdateUrl, $previewUpdateUrl) | Set-Content $mainProcessBundle

# Publish the preveiw version
PublishRelease -stage "Preview"

# Invalidate GCP CDN cache
# Try not to do this; it takes ~5 min.
#iex 'gcloud compute url-maps invalidate-cdn-cache taposcope-web-lb --path "/downloads/preview/*"'
