using Opc.UaFx.Client;
using Microsoft.EntityFrameworkCore;

public class OpcUaService
{
    private readonly OpcClient _client;
    public bool IsConnected => _client.State == OpcClientState.Connected;
    public const string ServerUrl = "opc.tcp://localhost:4840";
    public const int NUM_DEVICES = 10;
    public const int NUM_VALUES = 10;

    public OpcUaService()
    {
        _client = new OpcClient(ServerUrl);
        try { _client.Connect(); } catch { }
    }

    public Task<object?> ReadValue(string nodeId)
    {
        try { return Task.FromResult<object?>(_client.ReadNode(nodeId)); } catch { return Task.FromResult<object?>(null); }
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
                var node = $"ns=2;s=Device{d}.SimValue{i}";
                object? val = null;
                try { val = _client.ReadNode(node); } catch { }
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
                var node = $"ns=2;s=Device{d}.ParamValue{i}";
                object? val = null;
                try { val = _client.ReadNode(node); } catch { }
                list.Add(new { device = d, type = "param", index = i, node_id = node, value = val });
            }
        }
        return Task.FromResult(list);
    }

    public Task<bool> WriteParamValue(int device, int index, double value)
    {
        var node = $"ns=2;s=Device{device}.ParamValue{index}";
        try { _client.WriteNode(node, value); return Task.FromResult(true); } catch { return Task.FromResult(false); }
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
                        currSim.Value = Convert.ToDouble(simVal ?? 0);
                        currSim.NodeId = simNode;
                    }
                    else
                    {
                        db.CurrentValues.Add(new CurrentValue { DeviceId = device.Id, Type = "sim", Index = i, NodeId = simNode, Value = Convert.ToDouble(simVal ?? 0) });
                    }
                    db.HistoricalValues.Add(new HistoricalValue { DeviceId = device.Id, Type = "sim", Index = i, NodeId = simNode, Value = Convert.ToDouble(simVal ?? 0), Timestamp = DateTime.UtcNow.ToString("o") });

                    var paramNode = $"ns=2;s={deviceName}.ParamValue{i}";
                    var paramVal = await opc.ReadValue(paramNode);
                    var currParam = await db.CurrentValues.FirstOrDefaultAsync(c => c.DeviceId == device.Id && c.Type == "param" && c.Index == i);
                    if (currParam != null)
                    {
                        currParam.Value = Convert.ToDouble(paramVal ?? 0);
                        currParam.NodeId = paramNode;
                    }
                    else
                    {
                        db.CurrentValues.Add(new CurrentValue { DeviceId = device.Id, Type = "param", Index = i, NodeId = paramNode, Value = Convert.ToDouble(paramVal ?? 0) });
                    }
                    db.HistoricalValues.Add(new HistoricalValue { DeviceId = device.Id, Type = "param", Index = i, NodeId = paramNode, Value = Convert.ToDouble(paramVal ?? 0), Timestamp = DateTime.UtcNow.ToString("o") });
                }
            }
            await db.SaveChangesAsync();
            await Task.Delay(TimeSpan.FromSeconds(5), stoppingToken);
        }
    }
}
