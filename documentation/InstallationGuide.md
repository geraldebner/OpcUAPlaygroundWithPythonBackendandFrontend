# Installation Guide (Windows 10/11)

This guide explains how to start the VentilTester Backend and Frontend without programming knowledge.

## 1) Prerequisites
- **Windows 10 or 11 (64-bit)**
- **Internet connection** to download packages
- **Node.js 18+** (only for the Frontend)
  - Download: https://nodejs.org/en/download/prebuilt-installer
  - Keep default options during installation.
- **.NET Runtime is NOT required**, as the Backend is delivered as a self-contained EXE.

## 2) Download Artifacts
1. Open the GitHub Releases page of your project (e.g., https://github.com/geraldebner/OpcUAPlaygroundWithPythonBackendandFrontend/releases).
2. Download the following files from the latest release:
   - **VentilTesterBackend-win-x64.zip** (Backend)
   - **VentilTesterFrontend.zip** (Frontend) or the complete package **VentilTesterApp-Complete.zip**

## 3) Start Backend
1. Extract the zip file **VentilTesterBackend-win-x64.zip** to a folder of your choice (e.g., `C:\VentilTesterBackend`).
2. The folder contains:
   - `VentilTesterBackend.exe`
   - `appsettings.json`
   - Folder `SPSData` with the mapping file
3. Double-click **VentilTesterBackend.exe** to start.
   - The service runs on `http://localhost:5000`.
   - If Windows asks for a firewall exception, click **Allow access**.

## 4) Start Frontend
### Option A: Complete Package (recommended for users)
1. Extract the zip file **VentilTesterApp-Complete.zip** (e.g., to `C:\VentilTesterApp`).
2. In the `VentilTesterApp` folder, double-click **START.bat**.
   - Backend starts (port 5000).
   - Frontend starts (port 3000).
   - Open browser at `http://localhost:3000`.

### Option B: Frontend Package Only
1. Ensure **Node.js 18+** is installed (see link above).
2. Extract the zip file **VentilTesterFrontend.zip** (e.g., to `C:\VentilTesterFrontend`).
3. In the extracted folder, double-click **START_FRONTEND.bat**.
   - Frontend runs on `http://localhost:3000`.
   - If Windows asks for a firewall exception, click **Allow access**.

## 5) Directory Structure (important)
- Backend: `VentilTesterBackend.exe`, `appsettings.json`, and the `SPSData` folder must be in the same main directory.
- Frontend: `server.js`, `START_FRONTEND.bat`, `package.json`, and the `build` folder must be in the same main directory.

## 6) Troubleshooting
- **Port already in use**: If port 5000 (Backend) or 3000 (Frontend) is already in use, close other applications or adjust the ports in the configuration files.
- **Firewall**: If prompted, allow access for the Backend EXE and Node.js.
- **OPC UA Connection**: In `appsettings.json`, adjust the `EndpointUrl` if your OPC UA server uses a different address or port.

## 7) Manual Start Commands (optional, PowerShell)
If you prefer to start via command line:

- Backend:
  ```powershell
  cd C:\VentilTesterBackend
  .\VentilTesterBackend.exe
  ```

- Frontend (only if Node.js is installed):
  ```powershell
  cd C:\VentilTesterFrontend
  npm install --production
  node server.js
  ```

Done! Backend (http://localhost:5000) and Frontend (http://localhost:3000) should now be accessible.
