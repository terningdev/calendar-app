@echo off
echo Building frontend for terning.info deployment...
cd C:\dev\Calendar\frontend
npm run build
echo.
echo Build complete! 
echo.
echo Upload the contents of C:\dev\Calendar\frontend\build\ to your terning.info hosting folder
echo.
pause