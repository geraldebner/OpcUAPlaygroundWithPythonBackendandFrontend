using Opc.UaFx.Client;
using Opc.UaFx;
using Microsoft.EntityFrameworkCore;

public class OpcUaService
{
    private readonly OpcClient _client;
    public bool IsConnected => _client.State == OpcClientState.Connected;
    public const string ServerUrl = "opc.tcp://172.22.0.2:4842";//"opc.tcp://localhost:4840";
    public const int NUM_DEVICES = 1;
    public const int NUM_VALUES = 1;

    public OpcUaService()
    {
        _client = new OpcClient(ServerUrl);
        try { _client.Connect(); } catch { }
    }

    public Task<object?> ReadValue(string nodeId)
    {
        try
        {
            var raw = _client.ReadNode(nodeId);
            var numeric = ToNullableDouble(raw);
            if (numeric.HasValue) return Task.FromResult<object?>(numeric.Value);
            // fallback: unwrap OpcValue or return string
            if (raw is OpcValue ov) return Task.FromResult<object?>(ov.Value?.ToString());
            return Task.FromResult<object?>(raw?.ToString());
        }
        catch { return Task.FromResult<object?>(null); }
    }

    public Task<bool> WriteValue(string nodeId, double value)
    {
        try { _client.WriteNode(nodeId, value); return Task.FromResult(true); } catch { return Task.FromResult(false); }
    }

    public Task<List<object>> GetSimValues()
    {
        var list = new List<object>();
        for (int d = 1; d <= NUM_DEVICES; d++)
        {
            for (int i = 1; i <= NUM_VALUES; i++)
            {
                var node = $"ns=5;i=6882"; //$"ns=2;s=Device{d}.SimValue{i}";
                object? val = null;
                try
                {
                    var raw = _client.ReadNode(node);
                    var numeric = ToNullableDouble(raw);
                    if (numeric.HasValue) val = numeric.Value;
                    else if (raw is OpcValue ov) val = ov.Value?.ToString();
                    else val = raw?.ToString();
                }
                catch { }
                list.Add(new { device = d, type = "sim", index = i, node_id = node, value = val });
            }
        }
        return Task.FromResult(list);
    }

    public Task<List<object>> GetParamValues()
    {
        var list = new List<object>();
        for (int d = 1; d <= NUM_DEVICES; d++)
        {
            for (int i = 1; i <= NUM_VALUES; i++)
            {
                //var node =  $"ns=2;s=Device{d}.ParamValue{i}";
                var node = $"ns=5;i=6882"; 
                object? val = null;
                try
                {
                    var raw = _client.ReadNode(node);
                    var numeric = ToNullableDouble(raw);
                    if (numeric.HasValue) val = numeric.Value;
                    else if (raw is OpcValue ov) val = ov.Value?.ToString();
                    else val = raw?.ToString();
                }
                catch { }
                list.Add(new { device = d, type = "param", index = i, node_id = node, value = val });
            }
        }
        return Task.FromResult(list);
    }

    public Task<bool> WriteParamValue(int device, int index, UInt32 value)
    {
        //var node = $"ns=2;s=Device{device}.ParamValue{index}";
        var node = $"ns=5;i=6882"; 
        try { _client.WriteNode(node, value); return Task.FromResult(true); } catch { return Task.FromResult(false); }
    }

    // Numeric helpers moved into this class so other methods can call them
    public static double ToDouble(object? val)
    {
        if (val == null) return 0.0;
        // Unwrap OpcValue if present
        if (val is OpcValue opcVal)
        {
            val = opcVal.Value;
        }
        // Direct numeric types
        if (val is double d) return d;
        if (val is float f) return Convert.ToDouble(f);
        if (val is decimal dec) return Convert.ToDouble(dec);
        if (val is int i) return Convert.ToDouble(i);
        if (val is long l) return Convert.ToDouble(l);
        if (val is short s) return Convert.ToDouble(s);
        if (val is byte b) return Convert.ToDouble(b);
        if (val is string str)
        {
            if (double.TryParse(str, System.Globalization.NumberStyles.Any, System.Globalization.CultureInfo.InvariantCulture, out var parsed)) return parsed;
            if (double.TryParse(str, out parsed)) return parsed;
            return 0.0;
        }
        // Try IConvertible
        if (val is IConvertible conv)
        {
            try { return Convert.ToDouble(conv); } catch { }
        }
        // Fallback: try parse ToString
        try
        {
            var text = val.ToString();
            if (text != null && double.TryParse(text, System.Globalization.NumberStyles.Any, System.Globalization.CultureInfo.InvariantCulture, out var parsed2)) return parsed2;
        }
        catch { }
        return 0.0;
    }

    public static double? ToNullableDouble(object? val)
    {
        if (val == null) return null;
        if (val is OpcValue opcVal) val = opcVal.Value;
        if (val is double d) return d;
        if (val is float f) return Convert.ToDouble(f);
        if (val is decimal dec) return Convert.ToDouble(dec);
        if (val is int i) return Convert.ToDouble(i);
        if (val is long l) return Convert.ToDouble(l);
        if (val is short s) return Convert.ToDouble(s);
        if (val is byte b) return Convert.ToDouble(b);
        if (val is string str)
        {
            if (double.TryParse(str, System.Globalization.NumberStyles.Any, System.Globalization.CultureInfo.InvariantCulture, out var parsed)) return parsed;
            if (double.TryParse(str, out parsed)) return parsed;
            return null;
        }
        if (val is IConvertible conv)
        {
            try { return Convert.ToDouble(conv); } catch { }
        }
        try
        {
            var text = val.ToString();
            if (text != null && double.TryParse(text, System.Globalization.NumberStyles.Any, System.Globalization.CultureInfo.InvariantCulture, out var parsed2)) return parsed2;
        }
        catch { }
        return null;
    }
}

// Background service to periodically read values and store in DB
public class BackgroundStoreService : BackgroundService
{
    private readonly IServiceProvider _sp;
    public BackgroundStoreService(IServiceProvider sp) { _sp = sp; }
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            using var scope = _sp.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var opc = scope.ServiceProvider.GetRequiredService<OpcUaService>();
            for (int d = 1; d <= OpcUaService.NUM_DEVICES; d++)
            {
                var deviceName = $"Device{d}";
                var device = await db.Devices.FirstOrDefaultAsync(x => x.Name == deviceName);
                if (device == null)
                {
                    device = new Device { Name = deviceName };
                    db.Devices.Add(device);
                    await db.SaveChangesAsync();
                }
                for (int i = 1; i <= OpcUaService.NUM_VALUES; i++)
                {
                    var simNode = $"ns=2;s={deviceName}.SimValue{i}";
                    var simVal = await opc.ReadValue(simNode);
                    var currSim = await db.CurrentValues.FirstOrDefaultAsync(c => c.DeviceId == device.Id && c.Type == "sim" && c.Index == i);
                    if (currSim != null)
                    {
                        currSim.Value = OpcUaService.ToDouble(simVal);
                        currSim.NodeId = simNode;
                    }
                    else
                    {
                        db.CurrentValues.Add(new CurrentValue { DeviceId = device.Id, Type = "sim", Index = i, NodeId = simNode, Value = OpcUaService.ToDouble(simVal) });
                    }
                    db.HistoricalValues.Add(new HistoricalValue { DeviceId = device.Id, Type = "sim", Index = i, NodeId = simNode, Value = OpcUaService.ToDouble(simVal), Timestamp = DateTime.UtcNow.ToString("o") });

                    var paramNode = $"ns=2;s={deviceName}.ParamValue{i}";
                    var paramVal = await opc.ReadValue(paramNode);
                    var currParam = await db.CurrentValues.FirstOrDefaultAsync(c => c.DeviceId == device.Id && c.Type == "param" && c.Index == i);
                    if (currParam != null)
                    {
                        currParam.Value = OpcUaService.ToDouble(paramVal);
                        currParam.NodeId = paramNode;
                    }
                    else
                    {
                        db.CurrentValues.Add(new CurrentValue { DeviceId = device.Id, Type = "param", Index = i, NodeId = paramNode, Value = OpcUaService.ToDouble(paramVal) });
                    }
                    db.HistoricalValues.Add(new HistoricalValue { DeviceId = device.Id, Type = "param", Index = i, NodeId = paramNode, Value = OpcUaService.ToDouble(paramVal), Timestamp = DateTime.UtcNow.ToString("o") });
                }
            }
            await db.SaveChangesAsync();
            await Task.Delay(TimeSpan.FromSeconds(5), stoppingToken);
        }
    }

    
}
