# VentilTester Application - GitHub Actions CI/CD

This repository includes automated build pipelines for the VentilTester application.

## Available Workflows

### 1. Backend Build (`build-backend.yml`)
Builds the .NET backend application for Windows and Linux.

**Triggers:**
- Push to `main` or `develop` branches (when backend files change)
- Pull requests to `main`
- Manual trigger via workflow_dispatch

**Outputs:**
- `VentilTesterBackend-win-x64.zip` - Self-contained Windows executable
- `VentilTesterBackend-linux-x64.zip` - Self-contained Linux executable
- Automatically creates GitHub releases on main branch pushes

### 2. Frontend Build (`build-frontend.yml`)
Builds the React frontend application.

**Triggers:**
- Push to `main` or `develop` branches (when frontend files change)
- Pull requests to `main`
- Manual trigger via workflow_dispatch

**Outputs:**
- `VentilTesterFrontend.tar.gz` - Production build (tar.gz)
- `VentilTesterFrontend.zip` - Production build (zip)
- Static files ready to serve with any web server

### 3. Complete Application Build (`build-complete.yml`)
Builds both backend and frontend, packages them together with documentation.

**Triggers:**
- Push to `main` branch
- Release creation
- Manual trigger via workflow_dispatch

**Outputs:**
- `VentilTesterApp-Complete.zip` - Full application package including:
  - Backend executable (Windows x64)
  - Frontend static files
  - Configuration files
  - README with installation instructions
  - START.bat script for easy startup

## How to Use

### Download Pre-built Releases
1. Go to the [Releases](../../releases) page
2. Download the desired version:
   - **Complete Package**: Download `VentilTesterApp-Complete.zip` for everything
   - **Backend Only**: Download `VentilTesterBackend-win-x64.zip` or `VentilTesterBackend-linux-x64.zip`
   - **Frontend Only**: Download `VentilTesterFrontend.zip`

### Download from Actions Artifacts
1. Go to the [Actions](../../actions) tab
2. Click on a successful workflow run
3. Scroll down to "Artifacts" section
4. Download the desired artifact

### Manual Trigger
1. Go to the [Actions](../../actions) tab
2. Select the workflow you want to run
3. Click "Run workflow" button
4. Choose the branch and click "Run workflow"

## Build Configuration

### Backend
- Target Framework: .NET 8.0
- Self-contained: Yes (includes .NET runtime)
- Single File: Yes (Windows only)
- Ready to Run: Yes (optimized for startup performance)

### Frontend
- Node.js: 18.x
- Build: Production optimized
- Source Maps: Disabled
- Output: Static HTML/CSS/JS files

## Local Development

### Backend
```bash
cd VentilTesterBackend
dotnet restore
dotnet build
dotnet run
```

### Frontend
```bash
cd VentiltesterFrontend
npm install
npm start
```

## Release Process

### Automatic Releases
- Pushing to `main` branch automatically triggers builds and creates releases
- Release tags follow the pattern: `v{run_number}`, `backend-v{run_number}`, `frontend-v{run_number}`

### Manual Releases
1. Create a new tag: `git tag v1.0.0`
2. Push the tag: `git push origin v1.0.0`
3. This triggers the complete build workflow

## Artifacts Retention
- Build artifacts: 30 days (backend, frontend)
- Complete application: 90 days
- GitHub releases: Permanent


