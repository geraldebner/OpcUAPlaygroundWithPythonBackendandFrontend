namespace VentilTesterBackend.Models;

public class KonfigurationLangzeittest
{
    public int OeffnungszeitVentil { get; set; }
    public int PausenzeitVentil { get; set; }

    // Offsets for up to 16 valves
    public int OffsetStartVentil1 { get; set; }
    public int OffsetStartVentil2 { get; set; }
    public int OffsetStartVentil3 { get; set; }
    public int OffsetStartVentil4 { get; set; }
    public int OffsetStartVentil5 { get; set; }
    public int OffsetStartVentil6 { get; set; }
    public int OffsetStartVentil7 { get; set; }
    public int OffsetStartVentil8 { get; set; }
    public int OffsetStartVentil9 { get; set; }
    public int OffsetStartVentil10 { get; set; }
    public int OffsetStartVentil11 { get; set; }
    public int OffsetStartVentil12 { get; set; }
    public int OffsetStartVentil13 { get; set; }
    public int OffsetStartVentil14 { get; set; }
    public int OffsetStartVentil15 { get; set; }
    public int OffsetStartVentil16 { get; set; }

    public double AnzahlGesamtSchlagzahlen { get; set; }
    public double AnzahlSchlagzahlenDetailtest { get; set; }

    public int DruckregelungDruckSollwert { get; set; }
    public int DruckregelungDruckSollwertMax { get; set; }
    public int DruckregelungDruckSollwertMin { get; set; }

    // Backward-compatible dictionary
    public Dictionary<string, string> Items { get; set; } = new();
}
