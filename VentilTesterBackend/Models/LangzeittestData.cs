using System.Collections.Generic;

namespace VentilTesterBackend.Models;

public class LangzeittestVentil
{
    public int Index { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Value { get; set; } = string.Empty; // counter or similar
}

public class LangzeittestBlockData
{
    public int BlockIndex { get; set; }
    public List<LangzeittestVentil> Ventils { get; set; } = new List<LangzeittestVentil>();
}
