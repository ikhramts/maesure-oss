$ErrorActionPreference = "Stop"

# Copy the downloads from stable staging bucket folder to the actual stable folder.
# We must copy the installers first (*.nupkg, *.exe), and only then update
# RELEASES file to indicate that the new version is available.
$previewStableUrl = "gs://taposcope-releases/downloads/preview/stable"
$stableUrl = "gs://taposcope-releases/downloads/stable"

iex "gsutil -h ""Cache-Control:public,max-age=31556952"" cp $previewStableUrl/*.nupkg $stableUrl"  # expires in a year - version is in the file name
iex "gsutil -h ""Cache-Control:public,max-age=86400"" cp $previewStableUrl/*.exe $stableUrl" # expires in a day; will cause a bit of extra traffic
iex "gsutil -h ""Cache-Control:public,max-age=60"" cp $previewStableUrl/RELEASES $stableUrl" # expires in every 60 sec

# Clean up all the old stuff in the target bucket
iex "gsutil -m rsync -d -r $previewStableUrl $stableUrl"
