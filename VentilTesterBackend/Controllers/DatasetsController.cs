using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Microsoft.EntityFrameworkCore;
using VentilTesterBackend.Data;
using VentilTesterBackend.Models;
using VentilTesterBackend.Services;

namespace VentilTesterBackend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class DatasetsController : ControllerBase
    {
        private readonly AppDbContext _db;
        private readonly OpcUaService _opc;
        private readonly ILogger<DatasetsController> _logger;

        public DatasetsController(AppDbContext db, OpcUaService opc, ILogger<DatasetsController> logger)
        {
            _db = db;
            _opc = opc;
            _logger = logger;
            _logger.LogDebug("DatasetsController constructed");
        }

        // GET api/datasets
        [HttpGet]
        public async Task<IActionResult> Get()
        {
            _logger.LogInformation("Get all datasets called");
            var list = await _db.ParameterSets.OrderByDescending(p => p.CreatedAt).ToListAsync();
            _logger.LogDebug("Found {count} parameter sets", list.Count);
            return Ok(
                list.Select(p => new
                {
                    p.Id,
                    p.Name,
                    p.BlockIndex,
                    p.CreatedAt,
                    p.Comment,
                })
            );
        }

        // GET api/datasets/5
        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            _logger.LogInformation("Get dataset by id {id} called", id);
            var item = await _db.ParameterSets.FindAsync(id);
            if (item == null)
            {
                _logger.LogWarning("Dataset {id} not found", id);
                return NotFound();
            }
            _logger.LogDebug("Returning dataset {id} (block {block})", item.Id, item.BlockIndex);
            return Ok(
                new
                {
                    item.Id,
                    item.Name,
                    item.BlockIndex,
                    item.CreatedAt,
                    item.Comment,
                    payload = item.JsonPayload,
                }
            );
        }

        // POST api/datasets
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] JsonElement body)
        {
            _logger.LogInformation("Create dataset called");
            try
            {
                // body may contain either jsonPayload (string) or a 'block' object
                string name = string.Empty;
                string? comment = null;
                int blockIndex = 1;
                string jsonPayload = "{}";

                if (body.ValueKind == JsonValueKind.Object)
                {
                    if (body.TryGetProperty("name", out var n))
                        name = n.GetString() ?? string.Empty;
                    if (body.TryGetProperty("comment", out var c))
                        comment = c.GetString();
                    if (
                        body.TryGetProperty("blockIndex", out var bi) && bi.TryGetInt32(out var bix)
                    )
                        blockIndex = bix;
                    if (
                        body.TryGetProperty("jsonPayload", out var jp)
                        && jp.ValueKind == JsonValueKind.String
                    )
                        jsonPayload = jp.GetString() ?? "{}";
                    else if (body.TryGetProperty("block", out var blockObj))
                        jsonPayload = JsonSerializer.Serialize(blockObj);
                }

                if (string.IsNullOrWhiteSpace(name))
                    name = $"Parameters_{blockIndex}_{DateTime.UtcNow:yyyyMMddHHmmss}";

                var p = new ParameterSet
                {
                    Name = name,
                    Comment = comment,
                    BlockIndex = blockIndex,
                    CreatedAt = DateTime.UtcNow,
                    JsonPayload = jsonPayload,
                };
                _db.ParameterSets.Add(p);
                await _db.SaveChangesAsync();
                _logger.LogInformation("Created dataset {id} (block {block})", p.Id, p.BlockIndex);
                return CreatedAtAction(
                    nameof(GetById),
                    new { id = p.Id },
                    new
                    {
                        p.Id,
                        p.Name,
                        p.BlockIndex,
                        p.CreatedAt,
                    }
                );
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to create dataset: {message}", ex.Message);
                return BadRequest(new { error = "invalid body", detail = ex.Message });
            }
        }

        // DELETE api/datasets/5
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            _logger.LogInformation("Delete dataset {id} called", id);
            var item = await _db.ParameterSets.FindAsync(id);
            if (item == null)
            {
                _logger.LogWarning("Delete: dataset {id} not found", id);
                return NotFound();
            }
            _db.ParameterSets.Remove(item);
            await _db.SaveChangesAsync();
            _logger.LogInformation("Deleted dataset {id}", id);
            return NoContent();
        }

        // POST api/datasets/{id}/write  -- write parameter set back to OPC UA
        [HttpPost("{id}/write")]
        public async Task<IActionResult> WriteToOpc(int id)
        {
            _logger.LogInformation("Write dataset {id} to OPC UA called", id);
            var ps = await _db.ParameterSets.FindAsync(id);
            if (ps == null)
            {
                _logger.LogWarning("WriteToOpc: dataset {id} not found", id);
                return NotFound();
            }
            Block? block = null;
            try
            {
                block = JsonSerializer.Deserialize<Block>(ps.JsonPayload);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to deserialize payload for dataset {id}", id);
                return BadRequest(
                    new
                    {
                        error = "Failed to deserialize parameter set payload",
                        detail = ex.Message,
                    }
                );
            }
            if (block == null)
            {
                _logger.LogWarning("Dataset {id} payload deserialized to null", id);
                return BadRequest(new { error = "Parameter set payload is empty or invalid" });
            }
            var ok = _opc.WriteBlock(ps.BlockIndex, block);
            if (!ok)
            {
                _logger.LogError("OPC UA write failed for dataset {id} (block {block})", id, ps.BlockIndex);
                return StatusCode(500, new { error = "OPC UA write failed or server unreachable" });
            }
            _logger.LogInformation("Successfully wrote dataset {id} to OPC UA (block {block})", id, ps.BlockIndex);
            return Ok(
                new
                {
                    result = "written",
                    id = ps.Id,
                    blockIndex = ps.BlockIndex,
                }
            );
        }
    }
}
