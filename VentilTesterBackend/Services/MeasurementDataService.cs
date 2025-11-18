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
        "Daten/Strommessung",
        "DB_Daten_Langzeittest_1",
        "DB_Daten_Detailtest_1",
        "DB_Daten_Einzeltest_1"
    };
    
    private int _pollingIntervalMs = 1000; // Default 1 second

    public MeasurementDataService(
        OpcUaService opc,
        IServiceScopeFactory scopeFactory,
        ILogger<MeasurementDataService>? logger = null)
    {
        _opc = opc;
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
            // Try to read DatenReady parameter from the group
            var datenReadyParam = _opc.ReadNode(blockIndex, groupName, "DatenReady");
            
            if (datenReadyParam == null || string.IsNullOrEmpty(datenReadyParam.Value))
            {
                // DatenReady not available in this group, skip
                return;
            }

            // Parse DatenReady value
            if (!int.TryParse(datenReadyParam.Value, out int currentDatenReady))
            {
                _logger?.LogWarning(
                    "Could not parse DatenReady value '{Value}' for block {Block} group {Group}",
                    datenReadyParam.Value,
                    blockIndex,
                    groupName);
                return;
            }

            var key = $"{blockIndex}_{groupName}";
            var lastValue = _lastDatenReadyValues.GetOrAdd(key, currentDatenReady);

            // Check if DatenReady increased
            if (currentDatenReady > lastValue)
            {
                _logger?.LogInformation(
                    "DatenReady increased from {Old} to {New} for block {Block} group {Group} - saving dataset",
                    lastValue,
                    currentDatenReady,
                    blockIndex,
                    groupName);

                // Update tracked value
                _lastDatenReadyValues[key] = currentDatenReady;

                // Save the entire group as a dataset
                await SaveGroupAsDataset(blockIndex, groupName, currentDatenReady);
            }
            else if (currentDatenReady < lastValue)
            {
                // DatenReady was reset, update tracking
                _logger?.LogDebug(
                    "DatenReady reset from {Old} to {New} for block {Block} group {Group}",
                    lastValue,
                    currentDatenReady,
                    blockIndex,
                    groupName);
                _lastDatenReadyValues[key] = currentDatenReady;
            }
        }
        catch (InvalidOperationException)
        {
            // Expected when OPC UA not connected or parameter not found, don't spam logs
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

    private async Task SaveGroupAsDataset(int blockIndex, string groupName, int datenReadyValue)
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

            // Create a data structure to store
            var groupData = new
            {
                groups = new Dictionary<string, List<Parameter>>
                {
                    [groupName] = parameters
                }
            };

            var jsonPayload = System.Text.Json.JsonSerializer.Serialize(groupData);

            // Create dataset entry
            var dataset = new MeasurementSet
            {
                Name = $"{groupName}_Auto_{DateTime.Now:yyyy-MM-dd_HH-mm-ss}",
                BlockIndex = blockIndex,
                Comment = $"Auto-saved by MeasurementDataService (DatenReady={datenReadyValue})",
                IdentifierNumber = datenReadyValue,
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
