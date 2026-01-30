@echo off
echo ========================================
echo   MIDAS Local IP Address Finder
echo ========================================
echo.
echo Your local IP addresses:
echo.
ipconfig | findstr /i "IPv4"
echo.
echo ========================================
echo Use the IPv4 address that starts with
echo 192.168.x.x or 10.x.x.x
echo ========================================
echo.
echo Example: http://192.168.1.100:3000
echo.
pause

