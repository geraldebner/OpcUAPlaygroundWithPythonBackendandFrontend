using Microsoft.EntityFrameworkCore;

public static class ApiEndpoints
{
    public static void MapEndpoints(WebApplication app)
    {
        var startTime = DateTime.UtcNow;

        app.MapGet("/status", async (AppDbContext dbCtx, OpcUaService opc) =>
        {
            bool opcuaConnected = opc.IsConnected;
            bool dbStatus = await dbCtx.Devices.AnyAsync();
            var uptime = (DateTime.UtcNow - startTime).TotalSeconds;
            return Results.Json(new { opcua_connected = opcuaConnected, db_status = dbStatus, uptime_seconds = (int)uptime });
        });

        app.MapGet("/data", async (AppDbContext dbCtx) => await dbCtx.Devices.Select(d => d.Name).ToListAsync());

        app.MapGet("/sim_values", async (OpcUaService opcS) => await opcS.GetSimValues());
        app.MapGet("/param_values", async (OpcUaService opcS) => await opcS.GetParamValues());

        app.MapPost("/param_values", async (ParamValueIn input, OpcUaService opcS) =>
        {
            var success = await opcS.WriteParamValue(input.Device, input.Index, input.Value);
            return success ? Results.Json(new { status = "ok" }) : Results.BadRequest($"Write failed for Device{input.Device}.ParamValue{input.Index}");
        });

        app.MapPost("/read_opcua", async (OPCUADataIn input, OpcUaService opcS) =>
        {
            var v = await opcS.ReadValue(input.NodeId);
            return Results.Json(new { node_id = input.NodeId, value = v });
        });

        app.MapPost("/write_opcua", async (OPCUADataIn input, OpcUaService opcS) =>
        {
            var ok = await opcS.WriteValue(input.NodeId, input.Value);
            return ok ? Results.Json(new { status = "ok" }) : Results.BadRequest("Write failed");
        });

        app.MapPost("/save_data", async (OPCUADataIn input, AppDbContext dbCtx) =>
        {
            var match = System.Text.RegularExpressions.Regex.Match(input.NodeId, @"ns=2;s=(Device\d+)\.(SimValue|ParamValue)(\d+)");
            if (!match.Success) return Results.BadRequest("Invalid node_id format");
            var deviceName = match.Groups[1].Value;
            var valueType = match.Groups[2].Value == "SimValue" ? "sim" : "param";
            var index = int.Parse(match.Groups[3].Value);
            var device = await dbCtx.Devices.FirstOrDefaultAsync(d => d.Name == deviceName);
            if (device == null)
            {
                device = new Device { Name = deviceName };
                dbCtx.Devices.Add(device);
                await dbCtx.SaveChangesAsync();
            }
            var curr = await dbCtx.CurrentValues.FirstOrDefaultAsync(c => c.DeviceId == device.Id && c.Type == valueType && c.Index == index);
            if (curr != null)
            {
                curr.Value = input.Value;
                curr.NodeId = input.NodeId;
            }
            else
            {
                curr = new CurrentValue { DeviceId = device.Id, Type = valueType, Index = index, NodeId = input.NodeId, Value = input.Value };
                dbCtx.CurrentValues.Add(curr);
            }
            dbCtx.HistoricalValues.Add(new HistoricalValue { DeviceId = device.Id, Type = valueType, Index = index, NodeId = input.NodeId, Value = input.Value, Timestamp = DateTime.UtcNow.ToString("o") });
            await dbCtx.SaveChangesAsync();
            return Results.Json(new { device = deviceName, type = valueType, index = index, value = input.Value });
        });

        app.MapGet("/historical_values", async (string device_name, string? start, string? end, AppDbContext dbCtx) =>
        {
            var device = await dbCtx.Devices.FirstOrDefaultAsync(d => d.Name == device_name);
            if (device == null) return Results.Json(new object[0]);
            var query = dbCtx.HistoricalValues.Where(h => h.DeviceId == device.Id);
            if (!string.IsNullOrEmpty(start)) query = query.Where(h => String.Compare(h.Timestamp, start) >= 0);
            if (!string.IsNullOrEmpty(end)) query = query.Where(h => String.Compare(h.Timestamp, end) <= 0);
            var results = await query.OrderBy(h => h.Timestamp).Select(v => new { type = v.Type, index = v.Index, node_id = v.NodeId, value = v.Value, timestamp = v.Timestamp }).ToListAsync();
            return Results.Json(results);
        });
    }
}
