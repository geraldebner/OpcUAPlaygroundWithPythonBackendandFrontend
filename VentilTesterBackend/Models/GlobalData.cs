namespace VentilTesterBackend.Models;

/// <summary>
/// Global data (shared across all blocks)
/// </summary>
public class GlobalData
{
    public double BatteryStatus { get; set; }
    public double GeneralErrors { get; set; }
    public double TemperaturePLC { get; set; }
    public double Version { get; set; }
}
