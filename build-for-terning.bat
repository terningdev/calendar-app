@echo off
echo ========================================
echo Building terning.info deployment files
echo ========================================
echo.

cd frontend
echo Step 1: Installing/updating dependencies...
call npm install

echo.
echo Step 2: Building production version...
call npm run build

echo.
echo ========================================
echo BUILD COMPLETE FOR TERNING.INFO!
echo ========================================
echo.
echo NEXT STEPS:
echo.
echo 1. Upload ALL contents of 'frontend\build\' to your One.com public_html folder
echo    Files to upload:
echo    - index.html
echo    - asset-manifest.json  
echo    - static\ folder (with all contents)
echo.
echo 2. Delete any "under construction" files from One.com first
echo.
echo 3. Your website will be available at: https://terning.info
echo.
echo ⚠️  IMPORTANT: The app won't fully work until you deploy the backend
echo    to Railway or Render and update the API URL.
echo.
echo See TERNING_DEPLOYMENT.md for complete instructions.
echo.
pause