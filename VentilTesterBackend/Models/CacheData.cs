namespace VentilTesterBackend.Models;

/// <summary>
/// Cached data for a specific block
/// </summary>
public class CacheData
{
    public int BlockIndex { get; set; }
    public DateTime LastUpdated { get; set; }
    public GlobalData? GlobalData { get; set; }
    public AllgemeineParameterCache? AllgemeineParameter { get; set; }
    public List<VentilStatusData> VentilData { get; set; } = new();
}

/// <summary>
/// Runtime general parameters for cache (different from config AllgemeineParameter)
/// </summary>
public class AllgemeineParameterCache
{
    public double? Fehlerbit { get; set; }
    public double? CurrentAirPressure { get; set; }
    public double? CurrentAirFlow { get; set; }
    public double? CurrentForce { get; set; }
    public double? MessMode { get; set; }
    public double? OperationMode { get; set; }
}
