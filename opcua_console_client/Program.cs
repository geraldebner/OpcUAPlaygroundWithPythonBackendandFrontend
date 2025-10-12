using Opc.UaFx.Client;
using Opc.UaFx;

Console.WriteLine("OPC UA Console Client");
Console.WriteLine("Type 'help' for commands. Example: read ns=2;s=Device1.SimValue1 | write ns=2;s=Device1.ParamValue1 123.45 | exit");

var serverUrl = "opc.tcp://localhost:4840";
using var client = new OpcClient(serverUrl);
try
{
    client.Connect();
    Console.WriteLine($"Connected to {serverUrl}");
}
catch (Exception ex)
{
    Console.WriteLine($"Warning: could not connect to server: {ex.Message}");
}

string? line;
while (true)
{
    Console.Write("> ");
    line = Console.ReadLine();
    if (line == null) break;
    var parts = line.Trim().Split(' ', 3, StringSplitOptions.RemoveEmptyEntries);
    if (parts.Length == 0) continue;
    var cmd = parts[0].ToLowerInvariant();
    if (cmd == "exit" || cmd == "quit") break;
    if (cmd == "help")
    {
        Console.WriteLine("Commands:");
        Console.WriteLine("  read <nodeId>          - read value from node");
        Console.WriteLine("  write <nodeId> <val>  - write numeric or string value to node");
        Console.WriteLine("  exit                  - quit");
        continue;
    }
    if (cmd == "read")
    {
        if (parts.Length < 2) { Console.WriteLine("Usage: read <nodeId>"); continue; }
        var nodeId = parts[1];
        try
        {
            var raw = client.ReadNode(nodeId);
            if (raw is OpcValue ov)
            {
                Console.WriteLine($"Value: {ov.Value} (DataType={ov.DataType})");
            }
            else
            {
                Console.WriteLine($"Value: {raw}");
            }
        }
        catch (Exception ex) { Console.WriteLine($"Read error: {ex.Message}"); }
        continue;
    }
    if (cmd == "write")
    {
        if (parts.Length < 3) { Console.WriteLine("Usage: write <nodeId> <value>"); continue; }
        var nodeId = parts[1];
        var valueText = parts[2];
        // Try numeric first
        if (double.TryParse(valueText, System.Globalization.NumberStyles.Any, System.Globalization.CultureInfo.InvariantCulture, out var dbl))
        {
            try { client.WriteNode(nodeId, dbl); Console.WriteLine("Wrote numeric value."); } catch (Exception ex) { Console.WriteLine($"Write error: {ex.Message}"); }
        }
        else
        {
            try { client.WriteNode(nodeId, valueText); Console.WriteLine("Wrote string value."); } catch (Exception ex) { Console.WriteLine($"Write error: {ex.Message}"); }
        }
        continue;
    }
    Console.WriteLine("Unknown command. Type 'help' for usage.");
}

Console.WriteLine("Exiting.");
