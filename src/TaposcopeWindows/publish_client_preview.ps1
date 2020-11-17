$ErrorActionPreference = "Stop"

#----- Calculate the version -----
# Each of the numbers has to be < 65535
$now = Get-Date
$year = $now.Year
$startOfTime = Get-Date -Year 1900 -Month 1 -Day 1 -Hour 0 -Minute 0 -Second 0 -Millisecond 0
$minutesElapsed = [Int32] [math]::floor($now.Subtract($startOfTime).TotalMinutes)
$secondSpot = [Int32] [math]::floor($minutesElapsed / 10000)
$thirdSpot = [Int32] ($minutesElapsed % 10000)
$version = "2.$secondSpot.$thirdSpot"

Write-Host "===== Version: $version"

#----- Settings -----
$projName = "Maesure.Desktop"

$slnPath = $PSScriptRoot
Write-Host "Solution path: $slnPath"
Write-Host ""

$msbuild = '&"C:\Program Files (x86)\Microsoft Visual Studio\2019\Community\MSBuild\Current\Bin\msbuild.exe"'
$squirrel = '&"' + $slnPath + '\packages\squirrel.windows.1.9.1\tools\Squirrel.exe"'
$signtool = '&"' + $slnPath + '\packages\squirrel.windows.1.9.1\tools\signtool.exe"'
$nuget = '&"' + $slnPath + '\Tools\nuget.exe"'

$distPath = "$slnPath\dist"
$stagingPath = "$distPath\staging"
$backupsPath = "$distPath\backups"
$distNupkg = "$distPath\$projName.$version.nupkg"


#----- Functions -----
function BuildClient() {
    Set-Location $distPath

    # Set the version in AssemblyInfo.cs. Back it up so we can revert it later.
    $assemblyInfoPath = "$slnPath\DesktopClient\Properties\AssemblyInfo.cs"
    $backupAssemblyInfoPath = "$backupsPath\AssemblyInfo.cs"
    Copy-Item -Path $assemblyInfoPath -Destination $backupAssemblyInfoPath -Force

    $oldAssemblyInfo = (Get-Content -Path $assemblyInfoPath -Raw)

    [regex]$versionRegex = 'Version\("[\d\.]+"\)'
    $newAssemblyVersion = "Version(""$version"")"
    $newAssemblyInfo = $versionRegex.Replace($oldAssemblyInfo, $newAssemblyVersion)

    Set-Content -Path $assemblyInfoPath -Value $newAssemblyInfo

    # Build the desktop client and move it to /dist
    iex "$msbuild $slnPath\DesktopClient\DesktopClient.csproj /p:Configuration=Release"

    #Put the old AssemblyInfo.cs back.
    Copy-Item -Path $backupAssemblyInfoPath -Destination $assemblyInfoPath -Force
}

function PublishRelease() {
    param([string]$stage)

    # Settings
    if ($stage -eq "Preview") {
        $checkUpdateUrl = "https://static.maesure.com/downloads/preview"
        $publishUrl = "gs://taposcope-releases/downloads/preview"
    } elseif ($stage -eq "Stable") {
        $checkUpdateUrl = "https://static.maesure.com/downloads/stable"

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
    Write-Host "              Publishing $stage "
    Write-Host "===================================================="
    Write-Host ""

    Clean

    # Copy the build artifacts to /dist.
    $copySource = "$slnPath\DesktopClient\bin\Release"
    $copyDest = "$stagingPath\lib\net45"
    #$exclude = @("*.pdb")

    New-Item -ItemType Directory -Force -Path "$stagingPath\lib\net45"

    #Get-ChildItem $copySource -Recurse -Exclude $exclude | Copy-Item -Verbose -Destination {Join-Path $copyDest $_.FullName.Substring($copySource.length)}
    Get-ChildItem $copySource -Recurse | Copy-Item -Verbose -Destination {Join-Path $copyDest $_.FullName.Substring($copySource.length)}

    # Copy .nuspec file to dist and set the version,.
    $nuspecSourcePath = "$slnPath\DesktopClient\Maesure.Desktop.nuspec"
    $nuspecDistPath = "$stagingPath\Maesure.Desktop.nuspec"
    ((Get-Content -Path $nuspecSourcePath -Raw) -replace "__VERSION__",$version) | Set-Content $nuspecDistPath
    
    # Start updating App.config with values for this release stage.
    $appConfigPath = "$stagingPath\lib\net45\Maesure.Desktop.exe.config"
    $appConfig = (Get-Content -Path $appConfigPath -Raw)

    # First: enable auto-updates.
    [regex]$enableUpdatesRegex = '<add\s+key="runUpdates"\s+value="[a-zA-Z0-9\.]+"\s+/>'
    $newAppConfig = $enableUpdatesRegex.replace($appConfig, '<add key="runUpdates" value="true"/>')

    # Second: set the correct url for checking the updates
    [regex]$checkUpdateUrlRegex = '<add\s+key="latestUpdateUrlRoot"\s+value="[a-zA-Z0-9\.:/]+"\s+/>'
    $newAppConfig = $checkUpdateUrlRegex.replace($newAppConfig, '<add key="latestUpdateUrlRoot" value="' + $checkUpdateUrl + '"/>')

    Set-Content -Path $appConfigPath -Value $newAppConfig
    # Done with App.config updates.

    # Prepare the MSI using Squirrel.Windows.
    iex "$nuget pack $stagingPath -OutputDirectory $distPath"
    iex "$squirrel --releasify $distNupkg"

    # Rename the .exe and the .msi to something more meaningful
    while (!(Test-Path "$distPath\Releases\Setup.exe")) { Start-Sleep -Milliseconds 500 }
    while (!(Test-Path "$distPath\Releases\Setup.msi")) { Start-Sleep -Milliseconds 500 }
    Start-Sleep -Milliseconds 200

    Rename-Item "$distPath\Releases\Setup.exe" -NewName "Maesure-for-Desktop.exe"
    Rename-Item "$distPath\Releases\Setup.msi" -NewName "Maesure-for-Desktop.msi"

    # Sing the executable
    while (!(Test-Path "$distPath\Releases\Maesure-for-Desktop.exe")) { Start-Sleep -Milliseconds 500 }
    while (!(Test-Path "$distPath\Releases\Maesure-for-Desktop.msi")) { Start-Sleep -Milliseconds 500 }
    Start-Sleep -Milliseconds 200

    $certPath = "$slnPath\DesktopClient\code-signing-certificate-2019-03-26.p12"
    iex "$signtool sign /a /f $certPath /p password /fd sha256 /tr http://timestamp.digicert.com /td sha256 $distPath\Releases\Maesure-for-Desktop.exe"
    iex "$signtool sign /a /f $certPath /p password /fd sha256 /tr http://timestamp.digicert.com /td sha256 $distPath\Releases\Maesure-for-Desktop.msi"

    # Publish to the releases bucket.
    iex "gsutil -m rsync -d -r $distPath\Releases $publishUrl"
}

function Clean() {
    Set-Location $slnPath
    Remove-Item -Recurse -Force $distPath
    Start-Sleep -Milliseconds 10
    New-Item -ItemType Directory -Force -Path $distPath
    Start-Sleep -Milliseconds 10
    New-Item -ItemType Directory -Force -Path $stagingPath
    Start-Sleep -Milliseconds 10
    New-Item -ItemType Directory -Force -Path $backupsPath
    Start-Sleep -Milliseconds 10
    Set-Location $distPath
}



#----- Main body -----
$startingPath = Get-Location

BuildClient
PublishRelease -stage "Preview"
PublishRelease -stage "Stable"

Set-Location $startingPath