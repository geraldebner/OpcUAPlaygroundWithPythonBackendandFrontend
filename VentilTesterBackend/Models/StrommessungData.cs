using System.Collections.Generic;

namespace VentilTesterBackend.Models;

public class StrommessungVentil
{
    public int Index { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Value { get; set; } = string.Empty; // measured value
}

public class StrommessungBlockStatus
{
    public int BlockIndex { get; set; }
    public string Status { get; set; } = string.Empty;
    public bool DatenReady { get; set; }
}

public class StrommessungBlockData
{
    public int BlockIndex { get; set; }
    public List<StrommessungVentil> Ventils { get; set; } = new List<StrommessungVentil>();
}
