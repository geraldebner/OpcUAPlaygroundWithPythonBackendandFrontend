namespace VentilTesterBackend.Models;

public class KonfigurationDetailtest
{
    public StromConfig Strom { get; set; } = new StromConfig();
    public DurchflussConfig Durchfluss { get; set; } = new DurchflussConfig();
    public KraftConfig Kraft { get; set; } = new KraftConfig();

    // Backward-compatible dictionary
    public Dictionary<string, string> Items { get; set; } = new();

    public class StromConfig
    {
        public bool StrommessungAktiv { get; set; }
        public int StrommessungSollwertDruck { get; set; }
        public int StrommessungSollwertDruckMax { get; set; }
        public int StrommessungSollwertDruckMin { get; set; }
        public int StrommessungMessdauer { get; set; }
        public int StrommessungWiederholungen { get; set; }
        public int StrommessungMinStromfluss { get; set; }
    }

    public class DurchflussConfig
    {
        public bool DurchflussmessungAktiv { get; set; }
        public int DurchflussmessungSollwertDruck { get; set; }
        public int DurchflussmessungMessdauer { get; set; }
        public int DurchflussmessungWiederholungen { get; set; }
        public int DurchflussmessungMinDurchfluss { get; set; }
    }

    public class KraftConfig
    {
        public bool KraftmessungAktiv { get; set; }
        public int KraftmessungSollwertDruck { get; set; }
        public int KraftmessungMessdauer { get; set; }
        public int KraftmessungWiederholungen { get; set; }
        public int KraftmessungMinKraft { get; set; }
    }
}
