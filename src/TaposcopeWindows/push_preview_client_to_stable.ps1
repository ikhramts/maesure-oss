$ErrorActionPreference = "Stop"

$previewStableUrl = "gs://taposcope-releases/downloads/preview/stable"
$stableUrl = "gs://taposcope-releases/downloads/stable"

iex "gsutil -m rsync -d -r $previewStableUrl $stableUrl"