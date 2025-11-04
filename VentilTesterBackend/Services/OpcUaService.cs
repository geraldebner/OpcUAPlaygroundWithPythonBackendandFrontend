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
    private readonly string _endpoint;
    private DateTime? _lastSuccessfulCheck = null;
    private string? _lastError = null;

    // helper: cache of property info could be added if performance needed

    public OpcUaService(IConfiguration config, NodeMapping mapping, ILogger<OpcUaService>? logger = null)
    {
        _config = config;
        _mapping = mapping;
        _logger = logger;
        _endpoint = _config.GetValue<string>("OpcUa:EndpointUrl") ?? "opc.tcp://localhost:4840";
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

    /// <summary>
    /// Indicates whether the service currently has a live connection to an OPC UA server.
    /// </summary>
    public bool IsConnected => _connected;

    /// <summary>
    /// The endpoint URL this service attempts to connect to (from configuration).
    /// </summary>
    public string Endpoint => _endpoint;

    /// <summary>
    /// Last time a health check succeeded (UTC), or null if none yet.
    /// </summary>
    public DateTime? LastSuccessfulCheck => _lastSuccessfulCheck;

    /// <summary>
    /// Last error message observed during health/read operations, or null if none.
    /// </summary>
    public string? LastError => _lastError;

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

    /*public List<Block> ReadAllBlocks()
    {
        var blocks = new List<Block>();
        for (int i = 1; i <= 4; i++)
        {
            blocks.Add(ReadBlock(i));
        }
        return blocks;
    }*/

    /*public Block ReadBlock(int index)
    {
        _logger?.LogDebug("ReadBlock start for block {Index} (connected={Connected})", index, _connected);

        // Ensure mapping is present
        var mappedGroups = _mapping?.GetGroupsForBlock(index);
        if (mappedGroups == null || mappedGroups.Count == 0)
        {
            throw new InvalidOperationException($"No mapping available for block {index}");
        }

        // Ensure OPC UA connection
        if (!_connected || _client == null)
        {
            throw new InvalidOperationException("OPC UA client not connected");
        }

        var block = new Block { Index = index };

        // Read values according to mapping
        foreach (var kv in mappedGroups)
        {
            var g = kv.Key; // e.g. AllgemeineParameter or Konfiguration_Detailtest/Strom
            var list = new List<Parameter>();
            foreach (var entry in kv.Value)
            {
                var param = entry.Param;
                var nodeId = entry.NodeId;
                if (string.IsNullOrEmpty(nodeId))
                {
                    list.Add(new Parameter { Name = param, Value = string.Empty, DataType = null });
                    continue;
                }

                try
                {
                    var node = _client.ReadNode(nodeId);
                    var rawVal = node.Value;
                    var value = ConvertReadValueToString(rawVal);
                    var dtype = rawVal?.GetType().Name;
                    list.Add(new Parameter { Name = param, Value = value, DataType = dtype });
                    _logger?.LogTrace("Read node {NodeId} -> {Param} = {Value} (type={Type})", nodeId, param, value, dtype);
                }
                catch (Exception ex)
                {
                    _logger?.LogWarning(ex, "Failed to read node {NodeId} for param {Param}", nodeId, param);
                    // fail fast: bubble up as InvalidOperation so controllers can return explicit errors
                    throw new InvalidOperationException($"Failed to read node {nodeId} for parameter {param}: {ex.Message}");
                }
            }

            block.Groups[g] = list;

            // populate typed group objects when group key matches
            try
            {
                if (g.Equals("AllgemeineParameter", StringComparison.OrdinalIgnoreCase))
                {
                    foreach (var p in list)
                        block.AllgemeineParameter.Items[p.Name] = p.Value;
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
                    SetTypedProperties(block.Konfiguration_Detailtest, list);
                }
                else if (g.Contains('/'))
                {
                    var parts = g.Split('/');
                    var top = parts[0];
                    var subgroup = parts.Length > 1 ? parts[1] : null;
                    if (top.Equals("Konfiguration_Detailtest", StringComparison.OrdinalIgnoreCase) && !string.IsNullOrEmpty(subgroup))
                    {
                        foreach (var p in list)
                            block.Konfiguration_Detailtest.Items[p.Name] = p.Value;
                        if (string.Equals(subgroup, "Strom", StringComparison.OrdinalIgnoreCase)) SetTypedProperties(block.Konfiguration_Detailtest.Strom, list);
                        if (string.Equals(subgroup, "Durchfluss", StringComparison.OrdinalIgnoreCase)) SetTypedProperties(block.Konfiguration_Detailtest.Durchfluss, list);
                        if (string.Equals(subgroup, "Kraft", StringComparison.OrdinalIgnoreCase)) SetTypedProperties(block.Konfiguration_Detailtest.Kraft, list);
                    }
                }
            }
            catch { }
        }

        return block;
    }*/

    /// <summary>
    /// Write a whole Block to OPC UA using the loaded mapping. Returns true when all writes succeeded (best-effort).
    /// </summary>
    public bool WriteBlock(int index, Block block)
    {
        _logger?.LogDebug("WriteBlock requested block={Index} connected={Connected}", index, _connected);
        if (!_connected || _client == null) return false;

        var mappedGroups = _mapping?.GetGroupsForBlock(index);
        if (mappedGroups == null || mappedGroups.Count == 0)
        {
            _logger?.LogDebug("WriteBlock: no mapping for block {Block}", index);
            return false;
        }

        var allOk = true;

        // First write typed groups where applicable
        try { WriteTypedGroup(index, "Konfiguration_Detailtest/Kraft", block.Konfiguration_Detailtest.Kraft, mappedGroups); } catch { allOk = false; }
        try { WriteTypedGroup(index, "Konfiguration_Detailtest/Durchfluss", block.Konfiguration_Detailtest.Durchfluss, mappedGroups); } catch { allOk = false; }
        try { WriteTypedGroup(index, "Konfiguration_Detailtest/Strom", block.Konfiguration_Detailtest.Strom, mappedGroups); } catch { allOk = false; }
        try { WriteTypedGroup(index, "AllgemeineParameter", block.AllgemeineParameter, mappedGroups); } catch { /* best-effort */ }
        try { WriteTypedGroup(index, "Ventilkonfiguration", block.Ventilkonfiguration, mappedGroups); } catch { /* best-effort */ }
        try { WriteTypedGroup(index, "Konfiguration_Langzeittest", block.Konfiguration_Langzeittest, mappedGroups); } catch { /* best-effort */ }

        // Write Items dictionaries (backwards compatible)
        try
        {
            foreach (var kvp in block.AllgemeineParameter.Items)
            {
                var nodeId = _mapping.GetNodeId(index, "AllgemeineParameter", kvp.Key);
                if (!string.IsNullOrEmpty(nodeId))
                {
                    try { _client.WriteNode(nodeId, kvp.Value); _logger?.LogTrace("Wrote node {NodeId} <- {Value} (AllgemeineParameter.{Key})", nodeId, kvp.Value, kvp.Key); }
                    catch (Exception ex) { _logger?.LogWarning(ex, "Failed to write node {NodeId} for AllgemeineParameter.{Key}", nodeId, kvp.Key); allOk = false; }
                }
            }
        }
        catch { allOk = false; }

        try
        {
            foreach (var kvp in block.Ventilkonfiguration.Items)
            {
                var nodeId = _mapping.GetNodeId(index, "Ventilkonfiguration", kvp.Key) ?? _mapping.GetNodeId(index, "DB_VentilKonfiguration_1-4", kvp.Key);
                if (!string.IsNullOrEmpty(nodeId))
                {
                    try { _client.WriteNode(nodeId, kvp.Value); _logger?.LogTrace("Wrote node {NodeId} <- {Value} (Ventilkonfiguration.{Key})", nodeId, kvp.Value, kvp.Key); }
                    catch (Exception ex) { _logger?.LogWarning(ex, "Failed to write node {NodeId} for Ventilkonfiguration.{Key}", nodeId, kvp.Key); allOk = false; }
                }
            }
        }
        catch { allOk = false; }

        // Write groups (use mapping metadata when available)
        foreach (var kv in block.Groups)
        {
            var groupKey = kv.Key;
            foreach (var param in kv.Value)
            {
                var nodeId = _mapping.GetNodeId(index, groupKey, param.Name);
                if (string.IsNullOrEmpty(nodeId) && groupKey.Contains('/'))
                {
                    var main = groupKey.Split('/')[0];
                    nodeId = _mapping.GetNodeId(index, main, param.Name);
                }

                if (string.IsNullOrEmpty(nodeId))
                {
                    _logger?.LogWarning("WriteBlock: no node mapping for {Group}.{Param} block {Block}", groupKey, param.Name, index);
                    allOk = false;
                    continue;
                }

                try
                {
                    var mappingEntry = _mapping?.GetMappingEntry(index, groupKey, param.Name);
                    var toWrite = OpcUaDataConverter.ConvertForWrite(param.Value, mappingEntry);
                    _client.WriteNode(nodeId, toWrite ?? param.Value);
                    _logger?.LogTrace("WriteBlock: wrote node {NodeId} <- {Value} (group={Group})", nodeId, param.Value, groupKey);
                }
                catch (Exception ex)
                {
                    _logger?.LogWarning(ex, "WriteBlock: failed to write node {NodeId} for group {Group} param {Param}", nodeId, groupKey, param.Name);
                    allOk = false;
                }
            }
        }

        return allOk;
    }

    /// <summary>
    /// Read a single parameter value for a given block/group/parameter name.
    /// Returns null when the parameter cannot be resolved (no mapping and no reachable node).
    /// </summary>
    public Parameter? ReadParameter(int blockIndex, string groupKey, string paramName)
    {
        _logger?.LogDebug("ReadParameter requested block={Block} group={Group} name={Name} connected={Connected}", blockIndex, groupKey, paramName, _connected);
        // Try mapping lookup first
        var mappedGroups = _mapping?.GetGroupsForBlock(blockIndex);
        if (mappedGroups == null || mappedGroups.Count == 0)
        {
            throw new InvalidOperationException($"No mapping available for block {blockIndex}");
        }

        string? nodeId = _mapping.GetNodeId(blockIndex, groupKey, paramName);
        if (nodeId == null && groupKey.Contains('/'))
        {
            var main = groupKey.Split('/')[0];
            nodeId = _mapping.GetNodeId(blockIndex, main, paramName);
        }

        if (string.IsNullOrEmpty(nodeId))
        {
            // Parameter is known in mapping but no node id assigned -> expose name with empty value
            return new Parameter { Name = paramName, Value = string.Empty, DataType = null };
        }

        // nodeId present -> must have live connection
        if (!_connected || _client == null)
        {
            throw new InvalidOperationException("OPC UA client not connected");
        }

        try
        {
            var node = _client.ReadNode(nodeId);
            var rawVal = node.Value;
            var value = OpcUaDataConverter.ConvertReadValueToString(rawVal);
            var dtype = rawVal?.GetType().Name;
            _logger?.LogTrace("ReadParameter: node {NodeId} -> {Name} = {Value} (type={Type})", nodeId, paramName, value, dtype);
            return new Parameter { Name = paramName, Value = value, DataType = dtype };
        }
        catch (Exception ex)
        {
            _logger?.LogWarning(ex, "ReadParameter failed for node {NodeId}", nodeId);
            throw new InvalidOperationException($"Failed to read node {nodeId} for parameter {paramName}: {ex.Message}");
        }
    }

    /// <summary>
    /// Write a single parameter value for a given block/group/parameter name.
    /// Returns true when write was attempted/succeeded and false when not possible (e.g. disconnected).
    /// </summary>
    public bool WriteParameter(int blockIndex, string groupKey, string paramName, string value)
    {
        _logger?.LogDebug("WriteParameter requested block={Block} group={Group} name={Name} value={Value} connected={Connected}", blockIndex, groupKey, paramName, value, _connected);
        var mappedGroups = _mapping?.GetGroupsForBlock(blockIndex);
        if (mappedGroups == null || mappedGroups.Count == 0)
        {
            throw new InvalidOperationException($"No mapping available for block {blockIndex}");
        }

        string? nodeId = _mapping.GetNodeId(blockIndex, groupKey, paramName);
        if (nodeId == null && groupKey.Contains('/'))
        {
            var main = groupKey.Split('/')[0];
            nodeId = _mapping.GetNodeId(blockIndex, main, paramName);
        }

        if (string.IsNullOrEmpty(nodeId))
        {
            throw new InvalidOperationException($"No node mapping for parameter {paramName} in group {groupKey} block {blockIndex}");
        }

        if (!_connected || _client == null)
        {
            throw new InvalidOperationException("OPC UA client not connected");
        }

        try
        {
            var mappingEntry = _mapping?.GetMappingEntry(blockIndex, groupKey, paramName);
            var toWrite = OpcUaDataConverter.ConvertForWrite(value, mappingEntry);
            _client.WriteNode(nodeId, toWrite ?? value);
            _logger?.LogTrace("WriteParameter: wrote node {NodeId} <- {Value}", nodeId, value);
            return true;
        }
        catch (Exception ex)
        {
            _logger?.LogWarning(ex, "WriteParameter failed for node {NodeId}", nodeId);
            throw new InvalidOperationException($"Failed to write node {nodeId}: {ex.Message}");
        }
    }

    /// <summary>
    /// Read all parameters for a given block and group key. Group key may include subgroups like "Konfiguration_Detailtest/Strom".
    /// Returns an empty list when the group cannot be resolved.
    /// </summary>
    public List<Parameter> ReadGroup(int blockIndex, string groupKey)
    {
        _logger?.LogDebug("ReadGroup requested block={Block} group={Group} connected={Connected}", blockIndex, groupKey, _connected);
        var result = new List<Parameter>();
        var mappedGroups = _mapping?.GetGroupsForBlock(blockIndex);
        if (mappedGroups == null || mappedGroups.Count == 0)
        {
            throw new InvalidOperationException($"No mapping available for block {blockIndex}");
        }

        // try exact match
        if (!mappedGroups.TryGetValue(groupKey, out var entries))
        {
            // try main key if groupKey contains '/'
            if (groupKey.Contains('/'))
            {
                var main = groupKey.Split('/')[0];
                mappedGroups.TryGetValue(main, out entries);
            }
        }

        if (entries == null || entries.Count == 0)
        {
            _logger?.LogDebug("ReadGroup: no entries found for group {Group} in block {Block}", groupKey, blockIndex);
            return result;
        }

        foreach (var (param, nodeId) in entries)
        {
            if (string.IsNullOrEmpty(nodeId))
            {
                result.Add(new Parameter { Name = param, Value = string.Empty, DataType = null });
                continue;
            }

            if (!_connected || _client == null)
            {
                throw new InvalidOperationException("OPC UA client not connected");
            }

            try
            {
                var node = _client.ReadNode(nodeId);
                var rawVal = node.Value;
                var value = OpcUaDataConverter.ConvertReadValueToString(rawVal);
                var dtype = rawVal?.GetType().Name;
                result.Add(new Parameter { Name = param, Value = value, DataType = dtype });
                _logger?.LogTrace("ReadGroup: node {NodeId} -> {Param} = {Value}", nodeId, param, value);
            }
            catch (Exception ex)
            {
                _logger?.LogWarning(ex, "ReadGroup: failed to read node {NodeId} for param {Param}", nodeId, param);
                throw new InvalidOperationException($"Failed to read node {nodeId} for parameter {param}: {ex.Message}");
            }
        }

        return result;
    }

    /// <summary>
    /// Write a list of parameters for a given block/group. Returns true when all writes succeeded (best-effort).
    /// </summary>
    public bool WriteGroup(int blockIndex, string groupKey, IEnumerable<Parameter> values)
    {
        _logger?.LogDebug("WriteGroup requested block={Block} group={Group} connected={Connected}", blockIndex, groupKey, _connected);
        var mappedGroups = _mapping?.GetGroupsForBlock(blockIndex);
        if (mappedGroups == null || mappedGroups.Count == 0)
        {
            throw new InvalidOperationException($"No mapping available for block {blockIndex}");
        }

        if (!_connected || _client == null)
        {
            throw new InvalidOperationException("OPC UA client not connected");
        }

        // find entries for group
        if (!mappedGroups.TryGetValue(groupKey, out var entries))
        {
            if (groupKey.Contains('/'))
            {
                var main = groupKey.Split('/')[0];
                mappedGroups.TryGetValue(main, out entries);
            }
        }

        if (entries == null || entries.Count == 0)
        {
            _logger?.LogDebug("WriteGroup: no entries found for group {Group} in block {Block}", groupKey, blockIndex);
            return false;
        }

        var allOk = true;
        var mapByParam = entries.ToDictionary(e => e.Param, e => e.NodeId, StringComparer.OrdinalIgnoreCase);
        foreach (var p in values)
        {
            var paramName = p.Name;
            if (!mapByParam.TryGetValue(paramName, out var nodeId) || string.IsNullOrEmpty(nodeId))
            {
                _logger?.LogWarning("WriteGroup: no node mapping for param {Param} in group {Group} block {Block}", paramName, groupKey, blockIndex);
                allOk = false;
                continue;
            }

            try
            {
                // use mapping metadata for conversion if available
                var mappingEntry = _mapping?.GetMappingEntry(blockIndex, groupKey, paramName);
                var toWrite = OpcUaDataConverter.ConvertForWrite(p.Value, mappingEntry);
                _client.WriteNode(nodeId, toWrite ?? p.Value);
                _logger?.LogTrace("WriteGroup: wrote node {NodeId} <- {Value} (param={Param})", nodeId, p.Value, paramName);
            }
            catch (Exception ex)
            {
                _logger?.LogWarning(ex, "WriteGroup: failed to write node {NodeId} for param {Param}", nodeId, paramName);
                allOk = false;
            }
        }

        return allOk;
    }

    /// <summary>
    /// Try reading a node and return whether the operation succeeded. Used for health checks.
    /// </summary>
    public bool TryReadNode(string nodeId, out object? value)
    {
        value = null;
        if (!_connected || _client == null)
            return false;

        try
        {
            var node = _client.ReadNode(nodeId);
            value = node?.Value;
            // success -> update last successful timestamp and clear last error
            _lastSuccessfulCheck = DateTime.UtcNow;
            _lastError = null;
            return true;
        }
        catch (Exception ex)
        {
            // mark as disconnected to trigger reconnect logic
            try
            {
                _client?.Disconnect();
            }
            catch { }
            _client = null;
            _connected = false;
            _lastError = ex.Message;
            return false;
        }
    }

    /// <summary>
    /// Ping the OPC UA server by attempting a read on a health node. If nodeId is null the method will try a sensible default.
    /// Returns true when a read succeeded (server reachable).
    /// </summary>
    public bool Ping(string? healthNodeId = null)
    {
        var nodeToRead = healthNodeId;
        if (string.IsNullOrEmpty(nodeToRead))
        {
            // try a common server node id as fallback (may not exist on all servers)
            nodeToRead = "i=2253"; // standard Server_ServerStatus_CurrentTime node id (best-effort)
        }

        // If not connected, try to connect first (TryConnect will set _connected as side-effect)
        if (!_connected || _client == null)
        {
            TryConnect();
        }

        var ok = TryReadNode(nodeToRead, out var _);
        if (ok)
        {
            _lastSuccessfulCheck = DateTime.UtcNow;
            _lastError = null;
        }
        return ok;
    }

    /// <summary>
    /// Execute a command mapped in the DB_Kommands section (e.g. Langzeittest Start/Stop/Pause, Detailtest Start/Stop/Pause, Einzeltest Start/Stop/Pause).
    /// If a payload value is provided it will attempt to write that value to a matching parameter (e.g. Einzeltest_Ventilnummer) before triggering the command.
    /// The method will search the loaded mapping entries for a best-match node id for the requested testType/action.
    /// </summary>
    public bool ExecuteCommand(int blockIndex, string testType, string action, string? payload = null)
    {
        _logger?.LogDebug("ExecuteCommand requested block={Block} testType={TestType} action={Action} payloadProvided={HasPayload} connected={Connected}", blockIndex, testType, action, payload != null, _connected);
        if (!_connected || _client == null) return false;

        var mappedGroups = _mapping?.GetGroupsForBlock(blockIndex);
        if (mappedGroups == null || mappedGroups.Count == 0)
        {
            _logger?.LogDebug("ExecuteCommand: no mapping for block {Block}", blockIndex);
            return false;
        }

        // Log available mapping groups for easier debugging
        try
        {
            foreach (var g in mappedGroups)
            {
                _logger?.LogTrace("ExecuteCommand: mapping group '{Group}' contains {Count} entries", g.Key, g.Value.Count);
            }
        }
        catch { }

        // Optionally write payload to a parameter first (common for Einzeltest: Ventilnummer)
        if (!string.IsNullOrEmpty(payload))
        {
            // try find a parameter name that contains Ventilnummer or Einzeltest_Ventilnummer
            var found = false;
            foreach (var kv in mappedGroups)
            {
                foreach (var (param, nodeId) in kv.Value)
                {
                    if (string.IsNullOrEmpty(nodeId)) continue;
                    if (param.IndexOf("Ventilnummer", StringComparison.OrdinalIgnoreCase) >= 0 || param.IndexOf("Einzeltest_Ventilnummer", StringComparison.OrdinalIgnoreCase) >= 0)
                    {
                        try
                        {
                            _logger?.LogTrace("ExecuteCommand: attempting payload write to node {NodeId} for param {Param} with value '{Payload}'", nodeId, param, payload);
                            _client.WriteNode(nodeId, payload);
                            _logger?.LogTrace("ExecuteCommand: wrote payload to node {NodeId} <- {Value} (param={Param})", nodeId, payload, param);
                            found = true;
                            break;
                        }
                        catch (Exception ex)
                        {
                            _logger?.LogWarning(ex, "ExecuteCommand: failed writing payload to node {NodeId} for param {Param}", nodeId, param);
                            return false;
                        }
                    }
                }
                if (found) break;
            }
            if (!found)
            {
                _logger?.LogDebug("ExecuteCommand: payload provided but no Ventilnummer mapping found for block {Block}", blockIndex);
            }
        }

        // Now trigger the action node. We'll search mapping entries for a parameter name that matches pattern like "{testType}_{action}" or ends with "_{action}" and contains testType.
        string targetParamExact = $"{testType}_{action}";
        string targetAction = action;

        string? actionNodeId = null;
        foreach (var kv in mappedGroups)
        {
            foreach (var (param, nodeId) in kv.Value)
            {
                if (string.IsNullOrEmpty(nodeId)) continue;
                // log candidate
                _logger?.LogTrace("ExecuteCommand: checking mapping param='{Param}' node='{NodeId}'", param, nodeId);
                // exact match
                if (string.Equals(param, targetParamExact, StringComparison.OrdinalIgnoreCase)) { actionNodeId = nodeId; _logger?.LogTrace("ExecuteCommand: exact match found param={Param} node={NodeId}", param, nodeId); break; }
                // contains both testType and action
                if (param.IndexOf(testType, StringComparison.OrdinalIgnoreCase) >= 0 && param.EndsWith("_" + targetAction, StringComparison.OrdinalIgnoreCase)) { actionNodeId = nodeId; _logger?.LogTrace("ExecuteCommand: match found by containing testType and action param={Param} node={NodeId}", param, nodeId); break; }
                // ends with action only (fallback)
                if (param.EndsWith("_" + targetAction, StringComparison.OrdinalIgnoreCase)) { actionNodeId = nodeId; _logger?.LogTrace("ExecuteCommand: fallback match found param={Param} node={NodeId}", param, nodeId); break; }
            }
            if (!string.IsNullOrEmpty(actionNodeId)) break;
        }

        if (string.IsNullOrEmpty(actionNodeId))
        {
            _logger?.LogWarning("ExecuteCommand: could not find node mapping for action {Action} of testType {TestType} in block {Block}", action, testType, blockIndex);
            return false;
        }

        // Write a trigger value. Many command nodes are boolean (1/0) or integer. We'll attempt 1 or true.
        try
        {
            // try writing integer 1 first
            try { _logger?.LogTrace("ExecuteCommand: attempting integer trigger write to {NodeId}", actionNodeId); _client.WriteNode(actionNodeId, 1); _logger?.LogTrace("ExecuteCommand: triggered node {NodeId} <- 1", actionNodeId); return true; }
            catch (Exception exInt) { _logger?.LogTrace(exInt, "ExecuteCommand: integer write failed for {NodeId}", actionNodeId); }
            // try boolean true
            try { _logger?.LogTrace("ExecuteCommand: attempting boolean trigger write to {NodeId}", actionNodeId); _client.WriteNode(actionNodeId, true); _logger?.LogTrace("ExecuteCommand: triggered node {NodeId} <- true", actionNodeId); return true; }
            catch (Exception exBool) { _logger?.LogTrace(exBool, "ExecuteCommand: boolean write failed for {NodeId}", actionNodeId); }
            // try string
            try { _logger?.LogTrace("ExecuteCommand: attempting string trigger write to {NodeId} value={Action}", actionNodeId, action); _client.WriteNode(actionNodeId, action); _logger?.LogTrace("ExecuteCommand: triggered node {NodeId} <- {Action}", actionNodeId, action); return true; }
            catch (Exception ex) { _logger?.LogWarning(ex, "ExecuteCommand: failed writing to action node {NodeId}", actionNodeId); return false; }
        }
        catch (Exception ex)
        {
            _logger?.LogWarning(ex, "ExecuteCommand: unexpected error writing action node {NodeId}", actionNodeId);
            return false;
        }
    }

    public void Dispose()
    {
        try
        {
            _client?.Disconnect();
        }
        catch { }
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
                var propKey = OpcUaDataConverter.NormalizeKey(prop.Name);
                // find mapping entry with matching normalized param
                var match = candidates.FirstOrDefault(c => OpcUaDataConverter.NormalizeKey(c.Param) == propKey);
                if (match.Param != null)
                {
                    var nodeId = match.NodeId;
                    if (!string.IsNullOrEmpty(nodeId))
                    {
                        var raw = prop.GetValue(typedObject);
                        // write using the underlying value (if null, skip)
                        if (raw != null)
                        {
                            try { _client.WriteNode(nodeId, raw); _logger?.LogTrace("WriteTypedGroup: wrote node {NodeId} <- {Value} (prop={Prop})", nodeId, raw, prop.Name); }
                            catch (Exception ex) { _logger?.LogWarning(ex, "WriteTypedGroup: failed to write node {NodeId} for prop {Prop}", nodeId, prop.Name); }
                        }
                    }
                }
            }
            catch { }
        }
    }

    

    
}
