namespace VentilTesterBackend.Models;

public class Ventilkonfiguration
{
    public int VentilAnzahlInVerwendung { get; set; }
    public byte VentilSperre { get; set; }
    public int PWMAnregung { get; set; }
    public int PWMAnregungszeit { get; set; }
    public int PWMZwischenerregung { get; set; }
    public int PWMZwischenerregungszeit { get; set; }
    public int PWMHalten { get; set; }
    public bool KonfigUebernehmen { get; set; }

    // Backward-compatible dictionary
    public Dictionary<string, string> Items { get; set; } = new();
}
