using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;
using VentilTesterBackend.Data;
using VentilTesterBackend.Models;

namespace VentilTesterBackend.Controllers;

[ApiController]
[Route("api/[controller]")]
public class DatasetsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly Services.OpcUaService _opc;

    public DatasetsController(AppDbContext db, Services.OpcUaService opc)
    {
        _db = db;
        _opc = opc;
    }

    [HttpPost]
    public async Task<ActionResult<ParameterSet>> Save([FromBody] SaveDatasetRequest req)
    {
        // req.Block should contain the block payload for the dataset
        var ps = new ParameterSet
        {
            Name = req.Name ?? $"Snapshot_{DateTime.UtcNow:yyyyMMdd_HHmmss}",
            CreatedAt = DateTime.UtcNow,
            Comment = req.Comment,
            BlockIndex = req.BlockIndex,
            JsonPayload = JsonSerializer.Serialize(req.Block)
        };
        _db.ParameterSets.Add(ps);
        await _db.SaveChangesAsync();
        return Ok(ps);
    }

    [HttpGet]
    public async Task<ActionResult<List<ParameterSetSummary>>> List()
    {
        var list = await _db.ParameterSets
            .OrderByDescending(p => p.CreatedAt)
            .Select(p => new ParameterSetSummary { Id = p.Id, Name = p.Name, CreatedAt = p.CreatedAt, Comment = p.Comment, BlockIndex = p.BlockIndex })
            .ToListAsync();
        return Ok(list);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<Block>> Load(int id)
    {
        var ps = await _db.ParameterSets.FindAsync(id);
        if (ps == null) return NotFound();
        var block = JsonSerializer.Deserialize<Block>(ps.JsonPayload);
        if (block == null) return BadRequest("Failed to deserialize dataset");
        return Ok(block);
    }

    [HttpPost("{id}/write")]
    public async Task<ActionResult> WriteToOpc(int id)
    {
        var ps = await _db.ParameterSets.FindAsync(id);
        if (ps == null) return NotFound();
        var block = JsonSerializer.Deserialize<Block>(ps.JsonPayload);
        if (block == null) return BadRequest("Failed to deserialize dataset");
        var ok = _opc.WriteBlock(ps.BlockIndex, block);
        if (!ok) return StatusCode(500, "OPC UA write failed or server unreachable");
        return Ok();
    }
}

public class SaveDatasetRequest
{
    public string? Name { get; set; }
    public string? Comment { get; set; }
    public int BlockIndex { get; set; }
    public Block Block { get; set; } = new();
}

public class ParameterSetSummary
{
    public int Id { get; set; }
    public string Name { get; set; } = "";
    public DateTime CreatedAt { get; set; }
    public string? Comment { get; set; }
    public int BlockIndex { get; set; }
}
