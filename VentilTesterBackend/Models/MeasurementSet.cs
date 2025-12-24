using System.ComponentModel.DataAnnotations;

namespace VentilTesterBackend.Models;

public class MeasurementSet
{
    [Key]
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public string? Comment { get; set; }
    // User-defined identifier number for easier snapshot organization
    public int? IdentifierNumber { get; set; }
    // The block index this set belongs to (1..4)
    public int BlockIndex { get; set; }
    // JSON payload containing measurement snapshot (e.g. ventils, counters)
    public string JsonPayload { get; set; } = string.Empty;
    
    // Foreign key reference to TestRun - links measurement to a test run
    public int? TestRunMessID { get; set; }
    
    // Navigation property to TestRun
    public TestRun? TestRun { get; set; }
}
