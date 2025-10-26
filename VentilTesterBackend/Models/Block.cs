
using System.Text.Json.Serialization;

namespace VentilTesterBackend.Models;

public class Block
{
    public int Index { get; set; }

    // Generic groups for backward compatibility
    public Dictionary<string, List<Parameter>> Groups { get; set; } = new();

    // Typed group objects for the UI and DB
    public AllgemeineParameter AllgemeineParameter { get; set; } = new AllgemeineParameter();
    public Ventilkonfiguration Ventilkonfiguration { get; set; } = new Ventilkonfiguration();
    [JsonPropertyName("Konfiguration_Langzeittest")]
    public KonfigurationLangzeittest Konfiguration_Langzeittest { get; set; } = new KonfigurationLangzeittest();
    [JsonPropertyName("Konfiguration_Detailtest")]
    public KonfigurationDetailtest Konfiguration_Detailtest { get; set; } = new KonfigurationDetailtest();
}

