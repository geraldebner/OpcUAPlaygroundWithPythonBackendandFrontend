# Build VentilTester Frontend Executable with pkg

Write-Host "Building VentilTester Frontend..." -ForegroundColor Cyan

# Change to frontend directory
cd VentiltesterFrontend

# Install dependencies
Write-Host "Installing dependencies..." -ForegroundColor Yellow
npm install

# Build React app
Write-Host "Building React app..." -ForegroundColor Yellow
npm run build

# Create dist folder
mkdir dist -ErrorAction SilentlyContinue

# Install pkg globally
Write-Host "Installing pkg..." -ForegroundColor Yellow
npm install -g pkg

# Build executable
Write-Host "Creating standalone executable..." -ForegroundColor Yellow
pkg . --targets win-x64 --icon app.ico --output dist/VentilTesterFrontend.exe

# Create launcher script
Write-Host "Creating launcher..." -ForegroundColor Yellow
New-Item dist/START_FRONTEND.bat -Force | Out-Null
Add-Content dist/START_FRONTEND.bat "@echo off"
Add-Content dist/START_FRONTEND.bat "echo Starting VentilTester Frontend..."
Add-Content dist/START_FRONTEND.bat "start VentilTesterFrontend.exe"

Write-Host "Done! Executable ready at: VentiltesterFrontend\dist\VentilTesterFrontend.exe" -ForegroundColor Green
