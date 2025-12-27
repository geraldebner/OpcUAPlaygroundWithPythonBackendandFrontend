using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace VentilTesterBackend.Models;

/// <summary>
/// Represents the configuration of a single ventil (valve) within a test run.
/// Each test run can have up to 16 ventils configured.
/// </summary>
public class TestRunVentilConfig
{
    /// <summary>
    /// Primary Key
    /// </summary>
    [Key]
    public int Id { get; set; }

    /// <summary>
    /// Foreign key reference to the TestRun this ventil belongs to
    /// </summary>
    public int TestRunMessID { get; set; }

    /// <summary>
    /// Ventil number (1-16)
    /// </summary>
    [Required]
    public int VentilNumber { get; set; }

    /// <summary>
    /// Whether this ventil is enabled (participating) in the test run
    /// true = enabled (bit 0 in VentilSperre)
    /// false = disabled (bit 1 in VentilSperre)
    /// </summary>
    [Required]
    public bool Enabled { get; set; }

    /// <summary>
    /// Optional comment or note about this ventil for this test run
    /// </summary>
    public string? Comment { get; set; }

    /// <summary>
    /// Start counting value for this ventil when the test run starts.
    /// Defaults to 0 if not provided.
    /// </summary>
    public int StartCounterValue { get; set; } = 0;

    /// <summary>
    /// Counter value read from the PLC at the time the test run is stopped/completed.
    /// Will be null until the stop event persists the current counter.
    /// </summary>
    public int? EndCounterValue { get; set; }

    // Navigation property
    [JsonIgnore]
    public TestRun TestRun { get; set; } = null!;
}
