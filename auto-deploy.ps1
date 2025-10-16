# PowerShell script for automated deployment
# Configure these variables with your FTP details
$ftpServer = "ftp.one.com"
$ftpUsername = "your-username"
$ftpPassword = "your-password"
$remotePath = "/public_html/"
$localBuildPath = "C:\dev\Calendar\frontend\build"

# Build the project
Write-Host "Building frontend..." -ForegroundColor Green
Set-Location "C:\dev\Calendar\frontend"
npm run build

# TODO: Add FTP upload logic here
# You can use WinSCP command line or PowerShell FTP modules
Write-Host "Build complete! Upload $localBuildPath to $ftpServer" -ForegroundColor Yellow