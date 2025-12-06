using System.Collections.Concurrent;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using VentilTesterBackend.Data;
using VentilTesterBackend.Models;

namespace VentilTesterBackend.Services;

/// <summary>
/// Background service that monitors OPC UA measurement groups for data ready signals
/// and automatically saves datasets when DatenReady value increases.
/// </summary>
public class MeasurementDataService : IDisposable
{
    private readonly OpcUaService _opc;
    private readonly CacheService _cacheService;
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<MeasurementDataService>? _logger;
    private readonly CancellationTokenSource _cts = new();
    private Task? _monitoringTask;
    private bool _isEnabled = false;
    
    // Track last known DatenReady values for each block/group
    private readonly ConcurrentDictionary<string, int> _lastDatenReadyValues = new();
    
    // Configurable groups to monitor (group names that contain measurement data)
    private readonly List<string> _monitoredGroups = new()
    {
        "Daten_Strommessung/Ventil1",
        "Daten_Strommessung/Ventil2",
        "Daten_Strommessung/Ventil3",
        "Daten_Strommessung/Ventil4",
        "Daten_Strommessung/Ventil5",
        "Daten_Strommessung/Ventil6",
        "Daten_Strommessung/Ventil7",
        "Daten_Strommessung/Ventil8",
        "Daten_Strommessung/Ventil9",
        "Daten_Strommessung/Ventil10",
        "Daten_Strommessung/Ventil11",
        "Daten_Strommessung/Ventil12",
        "Daten_Strommessung/Ventil13",
        "Daten_Strommessung/Ventil14",
        "Daten_Strommessung/Ventil15",
        "Daten_Strommessung/Ventil16",
        "Daten_Durchflussmessung/Ventil1",
        "Daten_Durchflussmessung/Ventil2",
        "Daten_Durchflussmessung/Ventil3",
        "Daten_Durchflussmessung/Ventil4",
        "Daten_Durchflussmessung/Ventil5",
        "Daten_Durchflussmessung/Ventil6",
        "Daten_Durchflussmessung/Ventil7",
        "Daten_Durchflussmessung/Ventil8",
        "Daten_Durchflussmessung/Ventil9",
        "Daten_Durchflussmessung/Ventil10",
        "Daten_Durchflussmessung/Ventil11",
        "Daten_Durchflussmessung/Ventil12",
        "Daten_Durchflussmessung/Ventil13",
        "Daten_Durchflussmessung/Ventil14",
        "Daten_Durchflussmessung/Ventil15",
        "Daten_Durchflussmessung/Ventil16",
        "Daten_Kraftmessung/Ventil1",
        "Daten_Kraftmessung/Ventil2",
        "Daten_Kraftmessung/Ventil3",
        "Daten_Kraftmessung/Ventil4",
        "Daten_Kraftmessung/Ventil5",
        "Daten_Kraftmessung/Ventil6",
        "Daten_Kraftmessung/Ventil7",
        "Daten_Kraftmessung/Ventil8",
        "Daten_Kraftmessung/Ventil9",
        "Daten_Kraftmessung/Ventil10",
        "Daten_Kraftmessung/Ventil11",
        "Daten_Kraftmessung/Ventil12",
        "Daten_Kraftmessung/Ventil13",
        "Daten_Kraftmessung/Ventil14",
        "Daten_Kraftmessung/Ventil15",
        "Daten_Kraftmessung/Ventil16",
        "DB_Daten_Langzeittest_1"
    };
    
    private int _pollingIntervalMs = 1000; // Default 1 second

    public MeasurementDataService(
        OpcUaService opc,
        CacheService cacheService,
        IServiceScopeFactory scopeFactory,
        ILogger<MeasurementDataService>? logger = null)
    {
        _opc = opc;
        _cacheService = cacheService;
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    public bool IsEnabled => _isEnabled;
    
    public int PollingIntervalMs
    {
        get => _pollingIntervalMs;
        set => _pollingIntervalMs = Math.Max(100, value); // Minimum 100ms
    }

    public List<string> MonitoredGroups => _monitoredGroups;

    /// <summary>
    /// Start monitoring measurement groups for data changes
    /// </summary>
    public void Start()
    {
        if (_isEnabled)
        {
            _logger?.LogWarning("MeasurementDataService is already running");
            return;
        }

        _isEnabled = true;
        _logger?.LogInformation("Starting MeasurementDataService with {Count} monitored groups", _monitoredGroups.Count);
        
        _monitoringTask = Task.Run(async () => await MonitoringLoop(_cts.Token));
    }

    /// <summary>
    /// Stop monitoring measurement groups
    /// </summary>
    public void Stop()
    {
        if (!_isEnabled)
        {
            _logger?.LogWarning("MeasurementDataService is not running");
            return;
        }

        _isEnabled = false;
        _logger?.LogInformation("Stopping MeasurementDataService");
        
        // Monitoring loop will check _isEnabled and exit
    }

    private async Task MonitoringLoop(CancellationToken cancellationToken)
    {
        _logger?.LogInformation("MeasurementDataService monitoring loop started");

        while (!cancellationToken.IsCancellationRequested && _isEnabled)
        {
            try
            {
                // Check all blocks (1-4) for each monitored group
                for (int blockIndex = 1; blockIndex <= 4; blockIndex++)
                {
                    foreach (var groupName in _monitoredGroups)
                    {
                        await CheckGroupForDataReady(blockIndex, groupName);
                    }
                }
            }
            catch (Exception ex)
            {
                _logger?.LogError(ex, "Error in MeasurementDataService monitoring loop");
            }

            await Task.Delay(_pollingIntervalMs, cancellationToken);
        }

        _logger?.LogInformation("MeasurementDataService monitoring loop stopped");
    }

    private async Task CheckGroupForDataReady(int blockIndex, string groupName)
    {
        try
        {
            // Get cached data for this block
            var cachedData = _cacheService.GetCachedData(blockIndex);
            if (cachedData == null || cachedData.VentilData == null)
            {
                // Cache not ready yet, skip
                return;
            }

            // Determine measurement type and ventil number from group name
            int? currentDatenReady = null;
            int? messId = null;
            
            if (groupName.StartsWith("Daten_Strommessung/Ventil"))
            {
                var ventilNr = ExtractVentilNumber(groupName);
                if (ventilNr.HasValue)
                {
                    var ventilData = cachedData.VentilData.FirstOrDefault(v => v.VentilNr == ventilNr.Value);
                    if (ventilData != null)
                    {
                        currentDatenReady = ventilData.Strom.DatenReady;
                        messId = ventilData.Strom.MessID;
                    }
                }
            }
            else if (groupName.StartsWith("Daten_Durchflussmessung/Ventil"))
            {
                var ventilNr = ExtractVentilNumber(groupName);
                if (ventilNr.HasValue)
                {
                    var ventilData = cachedData.VentilData.FirstOrDefault(v => v.VentilNr == ventilNr.Value);
                    if (ventilData != null)
                    {
                        currentDatenReady = ventilData.Durchfluss.DatenReady;
                        messId = ventilData.Durchfluss.MessID;
                    }
                }
            }
            else if (groupName.StartsWith("Daten_Kraftmessung/Ventil"))
            {
                var ventilNr = ExtractVentilNumber(groupName);
                if (ventilNr.HasValue)
                {
                    var ventilData = cachedData.VentilData.FirstOrDefault(v => v.VentilNr == ventilNr.Value);
                    if (ventilData != null)
                    {
                        currentDatenReady = ventilData.Kraft.DatenReady;
                        messId = ventilData.Kraft.MessID;
                    }
                }
            }
            else if (groupName == "DB_Daten_Langzeittest_1")
            {
                // For Langzeittest, read DatenReady directly from OPC UA since it's not in cache
                var datenReadyParam = _opc.ReadNode(blockIndex, groupName, "DatenReady");
                if (datenReadyParam != null && int.TryParse(datenReadyParam.Value, out int drValue))
                {
                    currentDatenReady = drValue;
                }
                
                var messIdParam = _opc.ReadNode(blockIndex, groupName, "MessID");
                if (messIdParam != null && int.TryParse(messIdParam.Value, out int miValue))
                {
                    messId = miValue;
                }
            }

            if (!currentDatenReady.HasValue)
            {
                // DatenReady not available for this group, skip
                return;
            }

            var key = $"{blockIndex}_{groupName}";
            var lastValue = _lastDatenReadyValues.GetOrAdd(key, currentDatenReady.Value);

            // Check if DatenReady increased
            if (currentDatenReady.Value > lastValue)
            {
                _logger?.LogInformation(
                    "DatenReady increased from {Old} to {New} for block {Block} group {Group} (MessID: {MessId}) - saving dataset",
                    lastValue,
                    currentDatenReady.Value,
                    blockIndex,
                    groupName,
                    messId);

                // Update tracked value
                _lastDatenReadyValues[key] = currentDatenReady.Value;

                // Save the entire group as a dataset
                await SaveGroupAsDataset(blockIndex, groupName, currentDatenReady.Value, messId);
            }
            else if (currentDatenReady.Value < lastValue)
            {
                // DatenReady was reset, update tracking
                _logger?.LogDebug(
                    "DatenReady reset from {Old} to {New} for block {Block} group {Group}",
                    lastValue,
                    currentDatenReady.Value,
                    blockIndex,
                    groupName);
                _lastDatenReadyValues[key] = currentDatenReady.Value;
            }
        }
        catch (InvalidOperationException)
        {
            // Expected when OPC UA not connected or cache not ready, don't spam logs
        }
        catch (Exception ex)
        {
            _logger?.LogWarning(
                ex,
                "Error checking DatenReady for block {Block} group {Group}",
                blockIndex,
                groupName);
        }
    }

    /// <summary>
    /// Extract ventil number from group name like "Daten_Strommessung/Ventil5"
    /// </summary>
    private int? ExtractVentilNumber(string groupName)
    {
        var parts = groupName.Split('/');
        if (parts.Length >= 2)
        {
            var ventilPart = parts[1]; // e.g., "Ventil5"
            if (ventilPart.StartsWith("Ventil") && int.TryParse(ventilPart.Substring(6), out int ventilNr))
            {
                return ventilNr;
            }
        }
        return null;
    }

    private async Task SaveGroupAsDataset(int blockIndex, string groupName, int datenReadyValue, int? messIdFromCache = null)
    {
        try
        {
            // Read the entire group
            var parameters = _opc.ReadGroup(blockIndex, groupName);
            
            if (parameters == null || parameters.Count == 0)
            {
                _logger?.LogWarning(
                    "No parameters found for block {Block} group {Group}",
                    blockIndex,
                    groupName);
                return;
            }

            // Use MessID from cache if provided, otherwise search in parameters
            int? messId = messIdFromCache;
            
            if (!messId.HasValue)
            {
                var messIdParam = parameters.FirstOrDefault(p => 
                    p.Name != null && (
                        p.Name.Equals("MessID", StringComparison.OrdinalIgnoreCase) ||
                        p.Name.Equals("MessIDCurrent", StringComparison.OrdinalIgnoreCase) ||
                        p.Name.Contains("MessID", StringComparison.OrdinalIgnoreCase)
                    ));
                
                if (messIdParam != null && !string.IsNullOrEmpty(messIdParam.Value))
                {
                    if (int.TryParse(messIdParam.Value, out int parsedMessId))
                    {
                        messId = parsedMessId;
                        _logger?.LogDebug(
                            "Found MessID parameter '{ParamName}' with value {MessId} for block {Block} group {Group}",
                            messIdParam.Name,
                            messId,
                            blockIndex,
                            groupName);
                    }
                }
            }
            else
            {
                _logger?.LogDebug(
                    "Using MessID {MessId} from cache for block {Block} group {Group}",
                    messId,
                    blockIndex,
                    groupName);
            }

            // Fallback to DatenReady if MessID not found
            if (!messId.HasValue)
            {
                messId = datenReadyValue;
                _logger?.LogDebug(
                    "MessID not found, using DatenReady value {Value} as identifier for group {Group}",
                    datenReadyValue,
                    groupName);
            }

            // Create a data structure to store with lowercase property names to match manual saves
            var groupData = new
            {
                groups = new Dictionary<string, object>
                {
                    [groupName] = parameters.Select(p => new
                    {
                        name = p.Name,
                        value = p.Value,
                        dataType = p.DataType
                    }).ToList()
                }
            };

            var jsonOptions = new System.Text.Json.JsonSerializerOptions
            {
                PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase
            };
            var jsonPayload = System.Text.Json.JsonSerializer.Serialize(groupData, jsonOptions);

            // Create dataset entry
            var dataset = new MeasurementSet
            {
                Name = $"{groupName}_Auto_{DateTime.Now:yyyy-MM-dd_HH-mm-ss}",
                BlockIndex = blockIndex,
                Comment = $"Auto-saved by MeasurementDataService (DatenReady={datenReadyValue}, MessID={messId})",
                IdentifierNumber = messId,
                JsonPayload = jsonPayload,
                CreatedAt = DateTime.UtcNow
            };

            // Create a scope to access the DbContext
            using (var scope = _scopeFactory.CreateScope())
            {
                var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
                db.MeasurementSets.Add(dataset);
                await db.SaveChangesAsync();

                _logger?.LogInformation(
                    "Saved dataset {Name} (ID: {Id}) for block {Block} group {Group}",
                    dataset.Name,
                    dataset.Id,
                    blockIndex,
                    groupName);
            }
        }
        catch (Exception ex)
        {
            _logger?.LogError(
                ex,
                "Failed to save dataset for block {Block} group {Group}",
                blockIndex,
                groupName);
        }
    }

    public void Dispose()
    {
        _isEnabled = false;
        _cts.Cancel();
        
        try
        {
            _monitoringTask?.Wait(TimeSpan.FromSeconds(5));
        }
        catch (Exception ex)
        {
            _logger?.LogWarning(ex, "Error waiting for monitoring task to complete");
        }
        
        _cts.Dispose();
    }
}
