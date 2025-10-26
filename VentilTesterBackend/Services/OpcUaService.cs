using Opc.UaFx.Client;
using System.Text.Json;
using VentilTesterBackend.Models;
using Microsoft.Extensions.Logging;


namespace VentilTesterBackend.Services;

/// <summary>
/// Provides read/write access to VentilTester parameters over OPC UA.
/// This implementation tries to connect to a server using settings in appsettings.json.
/// If the connection or node mapping isn't available it will return simulated data so the frontend can be developed.
/// Adjust BaseNodeIdFormat in appsettings.json to match your server node structure.
/// </summary>
public class OpcUaService : IDisposable
{
    private readonly IConfiguration _config;
    private OpcClient? _client;
    private bool _connected = false;
    private readonly NodeMapping _mapping;
    private readonly ILogger<OpcUaService>? _logger;
    private readonly System.Threading.CancellationTokenSource _cts = new System.Threading.CancellationTokenSource();

    // helper: cache of property info could be added if performance needed

    public OpcUaService(IConfiguration config, NodeMapping mapping, ILogger<OpcUaService>? logger = null)
    {
        _config = config;
        _mapping = mapping;
        _logger = logger;
        TryConnect();
        // start background reconnection loop so the service will recover if the simulation server
        // is started after this backend. Runs until disposed.
        Task.Run(async () =>
        {
            var token = _cts.Token;
            while (!token.IsCancellationRequested)
            {
                try
                {
                    if (!_connected)
                    {
                        TryConnect();
                    }
                }
                catch { }
                await Task.Delay(5000, token).ContinueWith(_ => { });
            }
        });
    }

    private void TryConnect()
    {
        try
        {
            var endpoint = _config.GetValue<string>("OpcUa:EndpointUrl") ?? "opc.tcp://localhost:4840";
            _client = new OpcClient(endpoint);
            _client.Connect();
            _connected = true;
            _logger?.LogInformation("Connected to OPC UA server at {Endpoint}", endpoint);
        }
        catch
        {
            // ignore and stay in simulated mode
            _client = null;
            if (_connected)
            {
                _logger?.LogWarning("Lost connection to OPC UA server");
            }
            _connected = false;
        }
    }

    public List<Block> ReadAllBlocks()
    {
        var blocks = new List<Block>();
        for (int i = 1; i <= 4; i++)
        {
            blocks.Add(ReadBlock(i));
        }
        return blocks;
    }

    public Block ReadBlock(int index)
    {
        var block = new Block { Index = index };

        // If mapping present, use mapping to construct groups/params
        var mappedGroups = _mapping?.GetGroupsForBlock(index);
        if (mappedGroups != null && mappedGroups.Count > 0 && _connected && _client != null)
        {
            foreach (var kv in mappedGroups)
            {
                var g = kv.Key; // e.g. AllgemeineParameter or Konfiguration_Detailtest/Strom
                var list = new List<Parameter>();
                foreach (var (param, nodeId) in kv.Value)
                {
                    try
                    {
                        var node = _client.ReadNode(nodeId);
                        var value = node.Value?.ToString() ?? string.Empty;
                        var dtype = node.Value?.GetType().Name;
                        list.Add(new Parameter { Name = param, Value = value, DataType = dtype });
                    }
                    catch (Exception ex)
                    {
                        _logger?.LogWarning(ex, "Failed to read node {NodeId}", nodeId);
                        list.Add(new Parameter { Name = param, Value = string.Empty, DataType = null });
                    }
                }
                block.Groups[g] = list;

                // populate typed group objects when group key matches
                try
                {
                    // always store in Items dictionary for backward compatibility
                    if (g.Equals("AllgemeineParameter", StringComparison.OrdinalIgnoreCase))
                    {
                        foreach (var p in list)
                            block.AllgemeineParameter.Items[p.Name] = p.Value;
                        // set strongly-typed properties when names match
                        SetTypedProperties(block.AllgemeineParameter, list);
                    }
                    else if (g.StartsWith("DB_VentilKonfiguration", StringComparison.OrdinalIgnoreCase) || g.IndexOf("VentilKonfiguration", StringComparison.OrdinalIgnoreCase) >= 0 || g.Equals("Ventilkonfiguration", StringComparison.OrdinalIgnoreCase))
                    {
                        foreach (var p in list)
                            block.Ventilkonfiguration.Items[p.Name] = p.Value;
                        SetTypedProperties(block.Ventilkonfiguration, list);
                    }
                    else if (g.IndexOf("Langzeittest", StringComparison.OrdinalIgnoreCase) >= 0 || g.Equals("Konfiguration_Langzeittest", StringComparison.OrdinalIgnoreCase))
                    {
                        foreach (var p in list)
                            block.Konfiguration_Langzeittest.Items[p.Name] = p.Value;
                        SetTypedProperties(block.Konfiguration_Langzeittest, list);
                    }
                    else if (g.IndexOf("Detailtest", StringComparison.OrdinalIgnoreCase) >= 0 || g.Equals("Konfiguration_Detailtest", StringComparison.OrdinalIgnoreCase))
                    {
                        foreach (var p in list)
                            block.Konfiguration_Detailtest.Items[p.Name] = p.Value;
                        // if this is the top-level detailtest group (rare), try to populate where possible
                        SetTypedProperties(block.Konfiguration_Detailtest, list);
                    }
                    else if (g.Contains('/'))
                    {
                        // handle subgroup keys like Konfiguration_Detailtest/Strom
                        var parts = g.Split('/');
                        var top = parts[0];
                        var subgroup = parts.Length > 1 ? parts[1] : null;
                        if (top.Equals("Konfiguration_Detailtest", StringComparison.OrdinalIgnoreCase) && !string.IsNullOrEmpty(subgroup))
                        {
                            foreach (var p in list)
                                block.Konfiguration_Detailtest.Items[p.Name] = p.Value;
                            // populate nested typed object if available
                            if (string.Equals(subgroup, "Strom", StringComparison.OrdinalIgnoreCase)) SetTypedProperties(block.Konfiguration_Detailtest.Strom, list);
                            if (string.Equals(subgroup, "Durchfluss", StringComparison.OrdinalIgnoreCase)) SetTypedProperties(block.Konfiguration_Detailtest.Durchfluss, list);
                            if (string.Equals(subgroup, "Kraft", StringComparison.OrdinalIgnoreCase)) SetTypedProperties(block.Konfiguration_Detailtest.Kraft, list);
                        }
                    }
                }
                catch { }
            }
            return block;
        }

        // If mapping exists but server not connected, still expose parameter names (empty values) so UI can be used
        if (mappedGroups != null && mappedGroups.Count > 0)
        {
            foreach (var kv in mappedGroups)
            {
                var g = kv.Key;
                var list = kv.Value.Select(p => new Parameter { Name = p.Param, Value = string.Empty }).ToList();
                block.Groups[g] = list;
            }
            return block;
        }

        // Fallback simulated behaviour if no mapping available
        var fallbackGroups = new[] { "AllgemeineParameter", "Ventilkonfiguration", "Konfiguration_Langzeittest", "Konfiguration_Detailtest" };
        if (!_connected || _client == null)
        {
            foreach (var g in fallbackGroups)
            {
                var list = new List<Parameter>();
                for (int p = 1; p <= 6; p++)
                {
                    list.Add(new Parameter { Name = $"{g}_Param{p}", Value = $"Sample_{index}_{p}", DataType = "string" });
                }
                block.Groups[g] = list;
            }
            return block;
        }

        // Last-resort: attempt base format
        var baseFormat = _config.GetValue<string>("OpcUa:BaseNodeIdFormat") ?? "ns=2;s=VentilTester.Block{0}.{1}.{2}";
        foreach (var g in fallbackGroups)
        {
            var list = new List<Parameter>();
            for (int p = 1; p <= 20; p++)
            {
                var paramName = $"Param{p}";
                var nodeId = string.Format(baseFormat, index, g, paramName);
                try
                {
                    var value = _client.ReadNode(nodeId).Value?.ToString() ?? string.Empty;
                    list.Add(new Parameter { Name = paramName, Value = value, DataType = _client.ReadNode(nodeId).Value?.GetType().Name });
                }
                catch
                {
                    break;
                }
            }
            block.Groups[g] = list;
        }
        return block;
    }

    public bool WriteBlock(int index, Block block)
    {
        if (!_connected || _client == null)
            return false;

        // If mapping has nodeIds, use them
        var mappedGroups = _mapping?.GetGroupsForBlock(index);
        if (mappedGroups != null && mappedGroups.Count > 0)
        {
            // first prefer writing typed properties (strongly-typed POCOs)
            try
            {
                // AllgemeineParameter
                WriteTypedGroup(index, "AllgemeineParameter", block.AllgemeineParameter, mappedGroups);
                // Ventilkonfiguration
                WriteTypedGroup(index, "Ventilkonfiguration", block.Ventilkonfiguration, mappedGroups);
                // Langzeittest
                WriteTypedGroup(index, "Konfiguration_Langzeittest", block.Konfiguration_Langzeittest, mappedGroups);
                // Detailtest subgroups
                WriteTypedGroup(index, "Konfiguration_Detailtest/Strom", block.Konfiguration_Detailtest.Strom, mappedGroups);
                WriteTypedGroup(index, "Konfiguration_Detailtest/Durchfluss", block.Konfiguration_Detailtest.Durchfluss, mappedGroups);
                WriteTypedGroup(index, "Konfiguration_Detailtest/Kraft", block.Konfiguration_Detailtest.Kraft, mappedGroups);
            }
            catch { }

            // fallback: write any remaining values from generic Groups and Items dictionaries
            // write Items dictionaries (backwards compatible)
            try
            {
                foreach (var kvp in block.AllgemeineParameter.Items)
                {
                    var nodeId = _mapping.GetNodeId(index, "AllgemeineParameter", kvp.Key);
                    if (nodeId != null) _client.WriteNode(nodeId, kvp.Value);
                }
            }
            catch { }

            try
            {
                foreach (var kvp in block.Ventilkonfiguration.Items)
                {
                    var nodeId = _mapping.GetNodeId(index, "Ventilkonfiguration", kvp.Key) ?? _mapping.GetNodeId(index, "DB_VentilKonfiguration_1-4", kvp.Key);
                    if (nodeId != null) _client.WriteNode(nodeId, kvp.Value);
                }
            }
            catch { }

            try
            {
                foreach (var kvp in block.Konfiguration_Langzeittest.Items)
                {
                    var nodeId = _mapping.GetNodeId(index, "Konfiguration_Langzeittest", kvp.Key);
                    if (nodeId != null) _client.WriteNode(nodeId, kvp.Value);
                }
            }
            catch { }

            try
            {
                foreach (var kvp in block.Konfiguration_Detailtest.Items)
                {
                    var nodeId = _mapping.GetNodeId(index, "Konfiguration_Detailtest", kvp.Key);
                    if (nodeId == null)
                    {
                        nodeId = _mapping.GetNodeId(index, "Konfiguration_Detailtest/Strom", kvp.Key) ?? _mapping.GetNodeId(index, "Konfiguration_Detailtest/Durchfluss", kvp.Key) ?? _mapping.GetNodeId(index, "Konfiguration_Detailtest/Kraft", kvp.Key);
                    }
                    if (nodeId != null) _client.WriteNode(nodeId, kvp.Value);
                }
            }
            catch { }

            // fallback: write any remaining values from generic Groups
            foreach (var kv in block.Groups)
            {
                var groupKey = kv.Key;
                foreach (var param in kv.Value)
                {
                    var nodeId = _mapping.GetNodeId(index, groupKey, param.Name);
                    if (nodeId == null && groupKey.Contains('/'))
                    {
                        var main = groupKey.Split('/')[0];
                        nodeId = _mapping.GetNodeId(index, main, param.Name);
                    }
                    if (nodeId != null)
                    {
                        try { _client.WriteNode(nodeId, param.Value); }
                        catch { }
                    }
                }
            }

            return true;
        }

        // Fallback: use base format
        var baseFormat = _config.GetValue<string>("OpcUa:BaseNodeIdFormat") ?? "ns=2;s=VentilTester.Block{0}.{1}.{2}";
        foreach (var kv in block.Groups)
        {
            var group = kv.Key;
            foreach (var param in kv.Value)
            {
                var nodeId = string.Format(baseFormat, index, group, param.Name);
                try { _client.WriteNode(nodeId, param.Value); }
                catch { }
            }
        }
        return true;
    }

    public void Dispose()
    {
        try
        {
            _client?.Disconnect();
        }
        catch { }
    }

    // ----------------------- helper methods -----------------------
    private static string NormalizeKey(string s)
    {
        if (string.IsNullOrEmpty(s)) return string.Empty;
        var chars = s.Where(c => char.IsLetterOrDigit(c)).ToArray();
        return new string(chars).ToLowerInvariant();
    }

    private void SetTypedProperties(object target, IEnumerable<Parameter> parameters)
    {
        if (target == null) return;
        var props = target.GetType().GetProperties(System.Reflection.BindingFlags.Public | System.Reflection.BindingFlags.Instance);
        var propMap = props.ToDictionary(p => NormalizeKey(p.Name), p => p, StringComparer.OrdinalIgnoreCase);
        foreach (var p in parameters)
        {
            try
            {
                var key = NormalizeKey(p.Name);
                if (propMap.TryGetValue(key, out var pi))
                {
                    if (!pi.CanWrite) continue;
                    if (TryConvert(p.Value, pi.PropertyType, out var converted))
                    {
                        pi.SetValue(target, converted);
                    }
                }
            }
            catch { }
        }
    }

    private void WriteTypedGroup(int blockIndex, string groupKey, object typedObject, IReadOnlyDictionary<string, List<(string Param, string NodeId)>> mappedGroups)
    {
        if (typedObject == null || mappedGroups == null) return;
        // find candidate mapping entries: prefer exact groupKey, else any group that contains the main name
        var candidates = new List<(string Param, string NodeId)>();
        if (mappedGroups.TryGetValue(groupKey, out var list)) candidates.AddRange(list);
        else
        {
            // e.g. groupKey "Ventilkonfiguration" may be stored as DB_VentilKonfiguration_1-4
            var main = groupKey.Split('/')[0];
            foreach (var kv in mappedGroups)
            {
                if (kv.Key.IndexOf(main, StringComparison.OrdinalIgnoreCase) >= 0)
                    candidates.AddRange(kv.Value);
            }
        }
        if (candidates.Count == 0) return;

        var props = typedObject.GetType().GetProperties(System.Reflection.BindingFlags.Public | System.Reflection.BindingFlags.Instance);
        foreach (var prop in props)
        {
            if (!prop.CanRead) continue;
            if (prop.Name.Equals("Items", StringComparison.OrdinalIgnoreCase)) continue; // skip compatibility dict
            try
            {
                var propKey = NormalizeKey(prop.Name);
                // find mapping entry with matching normalized param
                var match = candidates.FirstOrDefault(c => NormalizeKey(c.Param) == propKey);
                if (match.Param != null)
                {
                    var nodeId = match.NodeId;
                    if (!string.IsNullOrEmpty(nodeId))
                    {
                        var raw = prop.GetValue(typedObject);
                        // write using the underlying value (if null, skip)
                        if (raw != null)
                        {
                            try { _client.WriteNode(nodeId, raw); }
                            catch { }
                        }
                    }
                }
            }
            catch { }
        }
    }

    private bool TryConvert(string? raw, Type targetType, out object? converted)
    {
        converted = null;
        if (targetType == typeof(string))
        {
            converted = raw ?? string.Empty;
            return true;
        }
        if (string.IsNullOrEmpty(raw)) return false;
        try
        {
            if (targetType == typeof(bool) || targetType == typeof(bool?))
            {
                if (raw == "0") { converted = false; return true; }
                if (raw == "1") { converted = true; return true; }
                if (bool.TryParse(raw, out var b)) { converted = b; return true; }
                return false;
            }
            if (targetType == typeof(int) || targetType == typeof(int?))
            {
                if (int.TryParse(raw, System.Globalization.NumberStyles.Any, System.Globalization.CultureInfo.InvariantCulture, out var i)) { converted = i; return true; }
                if (double.TryParse(raw, System.Globalization.NumberStyles.Any, System.Globalization.CultureInfo.InvariantCulture, out var d)) { converted = (int)d; return true; }
                return false;
            }
            if (targetType == typeof(double) || targetType == typeof(double?))
            {
                if (double.TryParse(raw, System.Globalization.NumberStyles.Any, System.Globalization.CultureInfo.InvariantCulture, out var d)) { converted = d; return true; }
                return false;
            }
            if (targetType == typeof(byte) || targetType == typeof(byte?))
            {
                if (byte.TryParse(raw, out var b)) { converted = b; return true; }
                if (int.TryParse(raw, out var ib) && ib >= byte.MinValue && ib <= byte.MaxValue) { converted = (byte)ib; return true; }
                return false;
            }
            // try generic change type
            converted = Convert.ChangeType(raw, targetType, System.Globalization.CultureInfo.InvariantCulture);
            return true;
        }
        catch { return false; }
    }
}
