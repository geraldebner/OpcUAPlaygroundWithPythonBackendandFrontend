using Opc.UaFx.Client;
using Opc.UaFx;

Console.WriteLine("OPC UA Console Client");
Console.WriteLine("Type 'help' for commands. Example: read ns=2;s=Device1.SimValue1 | write ns=2;s=Device1.ParamValue1 123.45 | exit");

// Allow server URL from CLI arg, then environment variable, otherwise default
var serverUrl = args.Length > 0 ? args[0] : (Environment.GetEnvironmentVariable("OPCUA_SERVER_URL") ?? "opc.tcp://localhost:4840");
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
        // Infer type: bool, long, int, double, string (in that order)
        bool written = false;
        if (bool.TryParse(valueText, out var b))
        {
            try { client.WriteNode(nodeId, b); written = true; Console.WriteLine("Wrote bool value."); } catch (Exception ex) { Console.WriteLine($"Write error: {ex.Message}"); }
        }
        else if (long.TryParse(valueText, System.Globalization.NumberStyles.Integer, System.Globalization.CultureInfo.InvariantCulture, out var l))
        {
            try { client.WriteNode(nodeId, l); written = true; Console.WriteLine("Wrote long value."); } catch (Exception ex) { Console.WriteLine($"Write error: {ex.Message}"); }
        }
        else if (int.TryParse(valueText, System.Globalization.NumberStyles.Integer, System.Globalization.CultureInfo.InvariantCulture, out var i))
        {
            try { client.WriteNode(nodeId, i); written = true; Console.WriteLine("Wrote int value."); } catch (Exception ex) { Console.WriteLine($"Write error: {ex.Message}"); }
        }
        else if (double.TryParse(valueText, System.Globalization.NumberStyles.Any, System.Globalization.CultureInfo.InvariantCulture, out var dbl))
        {
            try { client.WriteNode(nodeId, dbl); written = true; Console.WriteLine("Wrote double value."); } catch (Exception ex) { Console.WriteLine($"Write error: {ex.Message}"); }
        }
        else
        {
            try { client.WriteNode(nodeId, valueText); written = true; Console.WriteLine("Wrote string value."); } catch (Exception ex) { Console.WriteLine($"Write error: {ex.Message}"); }
        }

        // If written, try to read back and show the stored value
        if (written)
        {
            try
            {
                var rawBack = client.ReadNode(nodeId);
                if (rawBack is OpcValue ovBack)
                {
                    Console.WriteLine($"Read back: {ovBack.Value} (DataType={ovBack.DataType})");
                }
                else
                {
                    Console.WriteLine($"Read back: {rawBack}");
                }
            }
            catch (Exception ex) { Console.WriteLine($"Read-back error: {ex.Message}"); }
        }
        continue;
    }
    Console.WriteLine("Unknown command. Type 'help' for usage.");
}

Console.WriteLine("Exiting.");
