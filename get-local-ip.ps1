# MIDAS Local IP Address Finder (PowerShell)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  MIDAS Local IP Address Finder" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Get all network adapters with IPv4 addresses
$adapters = Get-NetIPAddress -AddressFamily IPv4 | 
    Where-Object { $_.IPAddress -notlike "127.*" -and $_.IPAddress -notlike "169.254.*" } |
    Select-Object InterfaceAlias, IPAddress

if ($adapters.Count -eq 0) {
    Write-Host "No network adapters found!" -ForegroundColor Red
    Write-Host "Make sure you're connected to WiFi or Ethernet." -ForegroundColor Yellow
} else {
    Write-Host "Your local IP addresses:" -ForegroundColor Green
    Write-Host ""
    
    foreach ($adapter in $adapters) {
        Write-Host "  Network: " -NoNewline -ForegroundColor Yellow
        Write-Host $adapter.InterfaceAlias -ForegroundColor White
        Write-Host "  IP Address: " -NoNewline -ForegroundColor Yellow
        Write-Host $adapter.IPAddress -ForegroundColor White
        Write-Host "  Use in browser: " -NoNewline -ForegroundColor Yellow
        Write-Host "http://$($adapter.IPAddress):3000" -ForegroundColor Cyan
        Write-Host ""
    }
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Green
Write-Host "1. Copy the IP address above (usually 192.168.x.x)" -ForegroundColor White
Write-Host "2. Run: npm run dev" -ForegroundColor White
Write-Host "3. Click the smartphone icon in the app" -ForegroundColor White
Write-Host "4. Click 'Use This IP for QR Code' button" -ForegroundColor White
Write-Host "5. Scan the QR code with your mobile device" -ForegroundColor White
Write-Host ""
Write-Host "Note: Your mobile device must be on the same WiFi network!" -ForegroundColor Yellow
Write-Host ""

Read-Host "Press Enter to close"

