@echo off
echo Building React app for One.com deployment...

cd frontend
echo Installing dependencies...
call npm install

echo Building production version...
call npm run build

echo.
echo ======================================
echo BUILD COMPLETE!
echo ======================================
echo.
echo Your website files are in: frontend\build\
echo.
echo Steps to upload to One.com:
echo 1. Log into your One.com control panel
echo 2. Go to File Manager or use FTP
echo 3. Upload ALL contents of frontend\build\ to your public_html folder
echo 4. Make sure index.html is in the root of public_html
echo.
echo Your website will be available at: https://yourdomain.com
echo.
pause