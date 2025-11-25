# Grafana Management Scripts

Write-Host "VentilTester - Grafana Management" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan
Write-Host ""

function Show-Menu {
    Write-Host "1. Start Grafana" -ForegroundColor Green
    Write-Host "2. Stop Grafana" -ForegroundColor Yellow
    Write-Host "3. Restart Grafana" -ForegroundColor Blue
    Write-Host "4. View Grafana Logs" -ForegroundColor Magenta
    Write-Host "5. Remove Grafana (including data)" -ForegroundColor Red
    Write-Host "6. Open Grafana in Browser" -ForegroundColor Cyan
    Write-Host "7. Check Grafana Status" -ForegroundColor White
    Write-Host "0. Exit" -ForegroundColor Gray
    Write-Host ""
}

function Start-Grafana {
    Write-Host "Starting Grafana..." -ForegroundColor Green
    docker-compose up -d
    Start-Sleep -Seconds 3
    Write-Host ""
    Write-Host "Grafana is starting. Access it at: http://localhost:3001" -ForegroundColor Cyan
    Write-Host "Username: admin" -ForegroundColor White
    Write-Host "Password: admin123" -ForegroundColor White
}

function Stop-Grafana {
    Write-Host "Stopping Grafana..." -ForegroundColor Yellow
    docker-compose stop
    Write-Host "Grafana stopped." -ForegroundColor Yellow
}

function Restart-Grafana {
    Write-Host "Restarting Grafana..." -ForegroundColor Blue
    docker-compose restart
    Start-Sleep -Seconds 3
    Write-Host "Grafana restarted." -ForegroundColor Blue
}

function Show-GrafanaLogs {
    Write-Host "Showing Grafana logs (Press Ctrl+C to exit)..." -ForegroundColor Magenta
    docker-compose logs -f grafana
}

function Remove-Grafana {
    Write-Host "WARNING: This will remove Grafana and ALL its data!" -ForegroundColor Red
    $confirm = Read-Host "Are you sure? (yes/no)"
    if ($confirm -eq "yes") {
        Write-Host "Removing Grafana..." -ForegroundColor Red
        docker-compose down -v
        Write-Host "Grafana removed." -ForegroundColor Red
    } else {
        Write-Host "Cancelled." -ForegroundColor Gray
    }
}

function Open-GrafanaBrowser {
    Write-Host "Opening Grafana in browser..." -ForegroundColor Cyan
    Start-Process "http://localhost:3001"
}

function Show-GrafanaStatus {
    Write-Host "Grafana Status:" -ForegroundColor White
    docker-compose ps
    Write-Host ""
    Write-Host "Container Details:" -ForegroundColor White
    docker inspect ventiltester-grafana --format='{{.State.Status}} - {{.State.Health.Status}}' 2>$null
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Grafana container not found or not running." -ForegroundColor Red
    }
}

# Main loop
do {
    Show-Menu
    $choice = Read-Host "Select an option"
    Write-Host ""
    
    switch ($choice) {
        "1" { Start-Grafana }
        "2" { Stop-Grafana }
        "3" { Restart-Grafana }
        "4" { Show-GrafanaLogs }
        "5" { Remove-Grafana }
        "6" { Open-GrafanaBrowser }
        "7" { Show-GrafanaStatus }
        "0" { 
            Write-Host "Goodbye!" -ForegroundColor Gray
            break 
        }
        default { 
            Write-Host "Invalid option. Please try again." -ForegroundColor Red 
        }
    }
    
    if ($choice -ne "0") {
        Write-Host ""
        Write-Host "Press any key to continue..." -ForegroundColor Gray
        $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
        Clear-Host
    }
} while ($choice -ne "0")
