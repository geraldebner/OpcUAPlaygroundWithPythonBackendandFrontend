using System.Collections.Concurrent;
using Microsoft.Extensions.Logging;
using VentilTesterBackend.Models;

namespace VentilTesterBackend.Services;

/// <summary>
/// Background service that periodically reads and caches data
/// from the OPC UA server to reduce direct server access from frontend.
/// </summary>
public class CacheService : IDisposable
{
    private readonly OpcUaService _opc;
    private readonly ILogger<CacheService>? _logger;
    private readonly CancellationTokenSource _cts = new();
    private Task? _updateTask;
    private bool _isEnabled = false;
    
    // Cache for data per block (key: blockIndex)
    private readonly ConcurrentDictionary<int, CacheData> _cache = new();
    
    // Global data cache (shared across all blocks)
    private GlobalData? _globalDataCache;
    private DateTime _globalDataLastUpdated = DateTime.MinValue;
    
    private int _updateIntervalMs = 2000; // Default 2 seconds (matches frontend auto-update)
    private const int MinUpdateInterval = 500; // Minimum 500ms

    public CacheService(
        OpcUaService opc,
        ILogger<CacheService>? logger = null)
    {
        _opc = opc;
        _logger = logger;
    }

    public bool IsEnabled => _isEnabled;
    
    public int UpdateIntervalMs
    {
        get => _updateIntervalMs;
        set => _updateIntervalMs = Math.Max(MinUpdateInterval, value);
    }

    /// <summary>
    /// Start the background cache update task
    /// </summary>
    public void Start()
    {
        if (_isEnabled)
        {
            _logger?.LogWarning("CacheService is already running");
            return;
        }

        _isEnabled = true;
        _updateTask = Task.Run(() => UpdateLoopAsync(_cts.Token));
        _logger?.LogInformation("CacheService started with {IntervalMs}ms update interval", _updateIntervalMs);
    }

    /// <summary>
    /// Stop the background cache update task
    /// </summary>
    public void Stop()
    {
        if (!_isEnabled) return;
        
        _isEnabled = false;
        _cts.Cancel();
        _logger?.LogInformation("CacheService stopped");
    }

    /// <summary>
    /// Get cached data for a specific block
    /// </summary>
    public CacheData? GetCachedData(int blockIndex)
    {
        return _cache.TryGetValue(blockIndex, out var data) ? data : null;
    }

    /// <summary>
    /// Get all cached data
    /// </summary>
    public Dictionary<int, CacheData> GetAllCachedData()
    {
        return new Dictionary<int, CacheData>(_cache);
    }

    /// <summary>
    /// Main update loop that periodically refreshes cache
    /// </summary>
    private async Task UpdateLoopAsync(CancellationToken ct)
    {
        while (!ct.IsCancellationRequested)
        {
            try
            {
                await UpdateCacheAsync();
                await Task.Delay(_updateIntervalMs, ct);
            }
            catch (OperationCanceledException)
            {
                break;
            }
            catch (Exception ex)
            {
                _logger?.LogError(ex, "Error in CacheService update loop");
                await Task.Delay(5000, ct); // Wait longer on error
            }
        }
    }

    /// <summary>
    /// Update cache for all blocks (1-4)
    /// </summary>
    private async Task UpdateCacheAsync()
    {
        // Update global data (shared, update less frequently)
        if ((DateTime.UtcNow - _globalDataLastUpdated).TotalSeconds > 10)
        {
            await UpdateGlobalDataAsync();
        }

        // Update data for each block
        for (int blockIndex = 1; blockIndex <= 4; blockIndex++)
        {
            try
            {
                var data = await ReadDataAsync(blockIndex);
                _cache[blockIndex] = data;
            }
            catch (Exception ex)
            {
                _logger?.LogError(ex, "Failed to update cache for block {BlockIndex}", blockIndex);
            }
        }
    }

    /// <summary>
    /// Read global data from OPC UA server
    /// </summary>
    private Task UpdateGlobalDataAsync()
    {
        try
        {
            // Read global parameters using direct NodeId (GlobalData is not block-specific in XML mapping)
            // NodeIds from Mapping_Ventiltester_V4_NS5.xml <DB_GlobalData1> section
            object? batteryStatusVal = null, generalErrorsVal = null, temperaturePLCVal = null, versionVal = null;
            
            _opc.TryReadNode("ns=5;i=8018", out batteryStatusVal);     // BatteryStatus
            _opc.TryReadNode("ns=5;i=8019", out generalErrorsVal);      // GeneralErrors
            _opc.TryReadNode("ns=5;i=8017", out temperaturePLCVal);     // TemperaturePLC
            _opc.TryReadNode("ns=5;i=8016", out versionVal);            // Version

            _globalDataCache = new GlobalData
            {
                BatteryStatus = ConvertToDouble(batteryStatusVal),
                GeneralErrors = ConvertToDouble(generalErrorsVal),
                TemperaturePLC = ConvertToDouble(temperaturePLCVal),
                Version = ConvertToDouble(versionVal)
            };
            
            _globalDataLastUpdated = DateTime.UtcNow;
            
            _logger?.LogDebug("GlobalData updated: Battery={Battery}, Errors={Errors}, Temp={Temp}, Version={Version}",
                _globalDataCache.BatteryStatus, _globalDataCache.GeneralErrors, 
                _globalDataCache.TemperaturePLC, _globalDataCache.Version);
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Error updating global data cache");
        }
        
        return Task.CompletedTask;
    }

    /// <summary>
    /// Read data for a specific block
    /// </summary>
    private async Task<CacheData> ReadDataAsync(int blockIndex)
    {
        var data = new CacheData
        {
            BlockIndex = blockIndex,
            LastUpdated = DateTime.UtcNow,
            GlobalData = _globalDataCache
        };

        // Read AllgemeineParameter
        data.AllgemeineParameter = await ReadAllgemeineParameterAsync(blockIndex);

        // Read Ventil data (1-16)
        for (int ventilNr = 1; ventilNr <= 16; ventilNr++)
        {
            var ventilData = await ReadVentilDataAsync(blockIndex, ventilNr);
            data.VentilData.Add(ventilData);
        }

        return data;
    }

    /// <summary>
    /// Read AllgemeineParameter for a block
    /// </summary>
    private Task<AllgemeineParameterCache> ReadAllgemeineParameterAsync(int blockIndex)
    {
        try
        {
            var groupData = _opc.ReadGroup(blockIndex, "AllgemeineParameter");
            
            var result = new AllgemeineParameterCache
            {
                Fehlerbit = ConvertToDoubleNullable(groupData.FirstOrDefault(p => p.Name == "Fehlerbit")?.Value),
                CurrentAirPressure = ConvertToDoubleNullable(groupData.FirstOrDefault(p => p.Name == "CurrentAirPressure")?.Value),
                CurrentAirFlow = ConvertToDoubleNullable(groupData.FirstOrDefault(p => p.Name == "CurrentAirFlow")?.Value),
                CurrentForce = ConvertToDoubleNullable(groupData.FirstOrDefault(p => p.Name == "CurrentForce")?.Value),
                MessMode = ConvertToDoubleNullable(groupData.FirstOrDefault(p => p.Name == "MessMode")?.Value),
                OperationMode = ConvertToDoubleNullable(groupData.FirstOrDefault(p => p.Name == "OperationMode")?.Value)
            };
            
            return Task.FromResult(result);
        }
        catch (Exception ex)
        {
            _logger?.LogWarning(ex, "Failed to read AllgemeineParameter for block {BlockIndex}", blockIndex);
            return Task.FromResult(new AllgemeineParameterCache());
        }
    }

    /// <summary>
    /// Read data for a specific ventil
    /// </summary>
    private Task<VentilStatusData> ReadVentilDataAsync(int blockIndex, int ventilNr)
    {
        var ventilData = new VentilStatusData { VentilNr = ventilNr };

        try
        {
            // Read Strommessung
            var stromStatus = _opc.ReadNode(blockIndex, $"Daten_Strommessung/Ventil{ventilNr}", "Status");
            var stromReady = _opc.ReadNode(blockIndex, $"Daten_Strommessung/Ventil{ventilNr}", "DatenReady");
            var stromMessID = _opc.ReadNode(blockIndex, $"Daten_Strommessung/Ventil{ventilNr}", "MessIDCurrent");
            
            ventilData.Strom = new MeasurementTypeData
            {
                Status = ConvertToInt(stromStatus?.Value),
                DatenReady = ConvertToInt(stromReady?.Value),
                MessID = ConvertToInt(stromMessID?.Value)
            };

            // Read Durchflussmessung
            var durchflussStatus = _opc.ReadNode(blockIndex, $"Daten_Durchflussmessung/Ventil{ventilNr}", "Status");
            var durchflussReady = _opc.ReadNode(blockIndex, $"Daten_Durchflussmessung/Ventil{ventilNr}", "DatenReady");
            var durchflussMessID = _opc.ReadNode(blockIndex, $"Daten_Durchflussmessung/Ventil{ventilNr}", "MessIDCurrent");
            
            ventilData.Durchfluss = new MeasurementTypeData
            {
                Status = ConvertToInt(durchflussStatus?.Value),
                DatenReady = ConvertToInt(durchflussReady?.Value),
                MessID = ConvertToInt(durchflussMessID?.Value)
            };

            // Read Kraftmessung
            var kraftStatus = _opc.ReadNode(blockIndex, $"Daten_Kraftmessung/Ventil{ventilNr}", "Status");
            var kraftReady = _opc.ReadNode(blockIndex, $"Daten_Kraftmessung/Ventil{ventilNr}", "DatenReady");
            var kraftMessID = _opc.ReadNode(blockIndex, $"Daten_Kraftmessung/Ventil{ventilNr}", "MessIDCurrent");
            
            ventilData.Kraft = new MeasurementTypeData
            {
                Status = ConvertToInt(kraftStatus?.Value),
                DatenReady = ConvertToInt(kraftReady?.Value),
                MessID = ConvertToInt(kraftMessID?.Value)
            };

            // Read Counter from Daten_Langzeittest
            var zaehler = _opc.ReadNode(blockIndex, "Daten_Langzeittest", $"ZaehlerVentil_{ventilNr}");
            ventilData.Zaehler = ConvertToInt(zaehler?.Value);
        }
        catch (Exception ex)
        {
            _logger?.LogWarning(ex, "Failed to read data for ventil {VentilNr} in block {BlockIndex}", ventilNr, blockIndex);
        }

        return Task.FromResult(ventilData);
    }

    // Helper methods to convert OPC UA values to appropriate types
    private double ConvertToDouble(object? value)
    {
        if (value == null) return 0;
        try
        {
            return Convert.ToDouble(value);
        }
        catch
        {
            return 0;
        }
    }

    private double? ConvertToDoubleNullable(object? value)
    {
        if (value == null) return null;
        try
        {
            return Convert.ToDouble(value);
        }
        catch
        {
            return null;
        }
    }

    private int ConvertToInt(object? value)
    {
        if (value == null) return 0;
        try
        {
            return Convert.ToInt32(value);
        }
        catch
        {
            return 0;
        }
    }

    public void Dispose()
    {
        Stop();
        _cts.Dispose();
    }
}
