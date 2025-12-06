namespace VentilTesterBackend.Models;

/// <summary>
/// Ventil status data for overview display
/// </summary>
public class VentilStatusData
{
    public int VentilNr { get; set; }
    public int Zaehler { get; set; }
    
    public MeasurementTypeData Strom { get; set; } = new();
    public MeasurementTypeData Durchfluss { get; set; } = new();
    public MeasurementTypeData Kraft { get; set; } = new();
}

/// <summary>
/// Measurement type data (Status, DatenReady, MessID)
/// </summary>
public class MeasurementTypeData
{
    public int Status { get; set; }
    public int DatenReady { get; set; }
    public int MessID { get; set; }
}
