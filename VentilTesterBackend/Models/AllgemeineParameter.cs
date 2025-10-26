namespace VentilTesterBackend.Models;

public class AllgemeineParameter
{
    // Strongly-typed properties generated from Mapping_Ventiltester.xml
    public double SkalierungDruckmessungMin { get; set; }
    public double SkalierungDruckmessungMax { get; set; }
    public double SkalierungDurchflussmessungMin { get; set; }
    public double SkalierungDurchflussmessungMax { get; set; }
    public byte Fehlerbit { get; set; }

    // Backward-compatible dictionary (kept so existing code continues to work)
    public Dictionary<string, string> Items { get; set; } = new();
}
