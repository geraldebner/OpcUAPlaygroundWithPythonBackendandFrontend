using System.ComponentModel.DataAnnotations;

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

    // Navigation property
    public TestRun TestRun { get; set; } = null!;
}
