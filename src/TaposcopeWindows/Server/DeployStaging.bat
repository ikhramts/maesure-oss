dotnet publish -c Release
gcloud app deploy .\bin\Release\netcoreapp2.1\publish\app-staging.yml -q
