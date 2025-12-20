using System.ComponentModel.DataAnnotations;

namespace VentilTesterBackend.Models;

public class ParameterSet
{
    [Key]
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public string? Comment { get; set; }

    // The block index this set belongs to (1..4)
    public int BlockIndex { get; set; }

    // Type of parameter set: All, VentilAnsteuerparameter, VentilLangzeittestparameter, VentilDetailtestparameter, VentilEinzeltestparameter
    public string Type { get; set; } = "All";

    // JSON payload of the Block.Groups
    public string JsonPayload { get; set; } = string.Empty;
}
