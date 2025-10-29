using System.ComponentModel.DataAnnotations;

namespace VentilTesterBackend.Models;

public class MeasurementSet
{
    [Key]
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public string? Comment { get; set; }
    // The block index this set belongs to (1..4)
    public int BlockIndex { get; set; }
    // JSON payload containing measurement snapshot (e.g. ventils, counters)
    public string JsonPayload { get; set; } = string.Empty;
}
