using System.ComponentModel.DataAnnotations;

namespace VentilTesterBackend.Models;

/// <summary>
/// Represents a test run (Prüflauf) for valve testing.
/// Each test run has a unique MessID and links to parameter configurations.
/// </summary>
public class TestRun
{
    /// <summary>
    /// Primary Key: Measurement ID that is auto-incremented for each test run
    /// </summary>
    [Key]
    public int MessID { get; set; }

    /// <summary>
    /// Type of test run: Langzeittest, Detailtest, or Einzeltest
    /// </summary>
    [Required]
    [MaxLength(50)]
    public string TestType { get; set; } = string.Empty;

    /// <summary>
    /// Timestamp when the test run was started
    /// </summary>
    public DateTime StartedAt { get; set; }

    /// <summary>
    /// Timestamp when the test run was completed (nullable)
    /// </summary>
    public DateTime? CompletedAt { get; set; }

    /// <summary>
    /// The block index this test run belongs to (1..4)
    /// </summary>
    public int BlockIndex { get; set; }

    /// <summary>
    /// Foreign key reference to the Ventilkonfiguration parameter set used
    /// </summary>
    public int? VentilkonfigurationId { get; set; }

    /// <summary>
    /// Foreign key reference to the Langzeittest configuration parameter set used
    /// </summary>
    public int? KonfigurationLangzeittestId { get; set; }

    /// <summary>
    /// Foreign key reference to the Detailtest configuration parameter set used
    /// </summary>
    public int? KonfigurationDetailtestId { get; set; }

    /// <summary>
    /// Optional JSON field for storing additional test run information
    /// </summary>
    public string? AdditionalInfo { get; set; }

    /// <summary>
    /// Optional comment or description for this test run
    /// </summary>
    public string? Comment { get; set; }

    /// <summary>
    /// Status of the test run: Initialized, Running, Completed, Failed, Cancelled
    /// </summary>
    [Required]
    [MaxLength(30)]
    public string Status { get; set; } = "Initialized";

    // Navigation properties to ParameterSets
    public ParameterSet? VentilkonfigurationParameterSet { get; set; }
    public ParameterSet? KonfigurationLangzeittestParameterSet { get; set; }
    public ParameterSet? KonfigurationDetailtestParameterSet { get; set; }
}
