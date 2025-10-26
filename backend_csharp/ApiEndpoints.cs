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
            return Results.Json(new
            {
                opcua_connected = opcuaConnected,
                db_status = dbStatus,
                uptime_seconds = (int)uptime
            });
        });

        app.MapGet("/data", async (AppDbContext dbCtx) => await dbCtx.Devices.Select(d => d.Name).ToListAsync());

        app.MapGet("/sim_values", async (OpcUaService opcS) => await opcS.GetSimValues());
        app.MapGet("/param_values", async (OpcUaService opcS) => await opcS.GetParamValues());

        app.MapPost("/param_values", async (ParamValueIn input, OpcUaService opcS) =>
        {
            var success = await opcS.WriteParamValue(input.Device, input.Index, System.Convert.ToUInt32(input.Value));
            return success
                ? Results.Json(new { status = "ok" })
                : Results.BadRequest($"Write failed for Device{input.Device}.ParamValue{input.Index}");
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

    // Grafana-friendly timeseries endpoint: returns { time: epoch_ms, value: number }
    app.MapGet("/historical_timeseries", async (string device_name, string? type, int? index, string? start, string? end, AppDbContext dbCtx) =>
    {
      var device = await dbCtx.Devices.FirstOrDefaultAsync(d => d.Name == device_name);
      if (device == null) return Results.Json(new object[0]);
      var query = dbCtx.HistoricalValues.Where(h => h.DeviceId == device.Id);
      if (!string.IsNullOrEmpty(type)) query = query.Where(h => h.Type == type);
      if (index.HasValue) query = query.Where(h => h.Index == index.Value);
      if (!string.IsNullOrEmpty(start)) query = query.Where(h => String.Compare(h.Timestamp, start) >= 0);
      if (!string.IsNullOrEmpty(end)) query = query.Where(h => String.Compare(h.Timestamp, end) <= 0);
      var rows = await query.OrderBy(h => h.Timestamp).ToListAsync();
      var transformed = rows.Select(v => new
      {
        time = (long)(DateTime.Parse(v.Timestamp).ToUniversalTime() - DateTime.UnixEpoch).TotalMilliseconds,
        value = v.Value
      }).ToList();
      return Results.Json(transformed);
    });

        // Simple parameter editor (static HTML) to allow changing param values from a browser.
        app.MapGet("/param_editor", () => Results.Text(@"
<!doctype html>
<html>
  <head>
    <meta charset='utf-8'>
    <title>Parameter Editor</title>
    <style>body{font-family:Arial;margin:20px}label{display:block;margin-top:8px}</style>
  </head>
  <body>
    <h2>Parameter Editor</h2>
    <form id='editor'> 
      <label>Device name
        <select id='device'></select>
      </label>
      <label>Index <input id='index' type='number' value='1' min='1'></label>
      <label>Value <input id='value' type='number' step='any' value='0'></label>
      <div style='margin-top:12px'><button type='button' id='send'>Send</button></div>
    </form>
    <pre id='out' style='margin-top:12px;background:#f3f3f3;padding:8px;border-radius:4px'></pre>
    <script>
      async function loadDevices(){
        try{
          const res = await fetch('/data');
          const list = await res.json();
          const sel = document.getElementById('device');
          list.forEach(d=>{const o=document.createElement('option');o.value=d;o.textContent=d;sel.appendChild(o)});
        }catch(e){document.getElementById('out').textContent='Failed to load devices: '+e}
      }
      document.getElementById('send').addEventListener('click', async ()=>{
        const deviceName = document.getElementById('device').value;
        const index = parseInt(document.getElementById('index').value||'1');
        const value = parseFloat(document.getElementById('value').value||'0');
        const payload = { device: deviceName.replace(/[^0-9]/g,''), index: index, value: value };
        try{
          const r = await fetch('/param_values',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
          const txt = await r.text();
          document.getElementById('out').textContent = 'Response ('+r.status+'): '+txt;
        }catch(e){document.getElementById('out').textContent='Send failed: '+e}
      });
      loadDevices();
    </script>
  </body>
</html>
", "text/html"));
    }
}
