# VentilTesterBackend — Development logging

This short note explains how to enable more verbose logging when running the C# backend locally.

By default the backend uses `appsettings.json` and the ASP.NET Core logging configuration. For development we added an `appsettings.Development.json` that sets more verbose levels for the OPC UA service and the HTTP request logger.

How to enable Development logging (PowerShell)

1. Open a PowerShell terminal in the repository root (or in the `VentilTesterBackend` folder).
2. Set the environment variable and start the backend with the Development environment:

```powershell
$env:ASPNETCORE_ENVIRONMENT = 'Development'
dotnet run --project VentilTesterBackend
```

What this does
- When `ASPNETCORE_ENVIRONMENT` is `Development`, ASP.NET Core will load `appsettings.Development.json` on top of `appsettings.json`.
- The included `appsettings.Development.json` sets the following log levels:
  - `VentilTesterBackend.Services.OpcUaService` = `Trace` (very verbose per-node reads/writes)
  - `HttpRequestLogger` = `Debug` (HTTP request/response traces)

Tips
- If you don't see trace lines in the console, increase the global `Default` level to `Debug` or `Trace` in the same file.
- To persist logs to disk or emit structured JSON logs, consider adding Serilog (I can add a Serilog configuration if you want).


If you want this documentation somewhere else (top-level README or a docs page), tell me and I'll move it.
