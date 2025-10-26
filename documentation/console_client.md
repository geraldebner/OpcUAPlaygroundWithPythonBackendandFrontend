# C# Console Client (opcua_console_client)

This document describes the simple REPL console client implemented with `Opc.UaFx.Client`.

## Purpose

- Quick manual interaction with OPC UA nodes.
- Read a node value and write a value interactively.

## Build & Run

From repository root (PowerShell):

```powershell
dotnet build opcua_console_client
dotnet run --project opcua_console_client -- "opc.tcp://localhost:4840"
```

Or set the environment variable and run without arguments:

```powershell
$env:OPCUA_SERVER_URL = "opc.tcp://localhost:4840"
dotnet run --project opcua_console_client
```

## REPL Commands

- `help` — show help
- `read <nodeId>` — read value from node (examples: `ns=2;s=Device1.SimValue1`)
- `write <nodeId> <value>` — write value, client will attempt to infer type (bool, long, int, double, string)
- `exit` / `quit` — exit

Examples:

```text
> read ns=2;s=Device1.SimValue1
Value: 12.34 (DataType=Double)

> write ns=2;s=Device1.ParamValue1 42.5
Wrote double value.
Read back: 42.5 (DataType=Double)
```

## Notes

- The client performs a simple type inference; for more advanced types or arrays the write may need manual casting.
- Useful for smoke testing when developing the backend or frontends.
