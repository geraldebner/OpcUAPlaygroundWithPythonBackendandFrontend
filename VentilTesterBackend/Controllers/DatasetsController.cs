using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;
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

        public DatasetsController(AppDbContext db, OpcUaService opc)
        {
            _db = db;
            _opc = opc;
        }

        // GET api/datasets
        [HttpGet]
        public async Task<IActionResult> Get()
        {
            var list = await _db.ParameterSets.OrderByDescending(p => p.CreatedAt).ToListAsync();
            return Ok(list.Select(p => new { p.Id, p.Name, p.BlockIndex, p.CreatedAt, p.Comment }));
        }

        // GET api/datasets/5
        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var item = await _db.ParameterSets.FindAsync(id);
            if (item == null) return NotFound();
            return Ok(new { item.Id, item.Name, item.BlockIndex, item.CreatedAt, item.Comment, payload = item.JsonPayload });
        }

        // POST api/datasets
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] JsonElement body)
        {
            try
            {
                // body may contain either jsonPayload (string) or a 'block' object
                string name = string.Empty;
                string? comment = null;
                int blockIndex = 1;
                string jsonPayload = "{}";

                if (body.ValueKind == JsonValueKind.Object)
                {
                    if (body.TryGetProperty("name", out var n)) name = n.GetString() ?? string.Empty;
                    if (body.TryGetProperty("comment", out var c)) comment = c.GetString();
                    if (body.TryGetProperty("blockIndex", out var bi) && bi.TryGetInt32(out var bix)) blockIndex = bix;
                    if (body.TryGetProperty("jsonPayload", out var jp) && jp.ValueKind == JsonValueKind.String) jsonPayload = jp.GetString() ?? "{}";
                    else if (body.TryGetProperty("block", out var blockObj)) jsonPayload = JsonSerializer.Serialize(blockObj);
                }

                if (string.IsNullOrWhiteSpace(name)) name = $"Parameters_{blockIndex}_{DateTime.UtcNow:yyyyMMddHHmmss}";

                var p = new ParameterSet
                {
                    Name = name,
                    Comment = comment,
                    BlockIndex = blockIndex,
                    CreatedAt = DateTime.UtcNow,
                    JsonPayload = jsonPayload
                };
                _db.ParameterSets.Add(p);
                await _db.SaveChangesAsync();
                return CreatedAtAction(nameof(GetById), new { id = p.Id }, new { p.Id, p.Name, p.BlockIndex, p.CreatedAt });
            }
            catch (Exception ex)
            {
                return BadRequest(new { error = "invalid body", detail = ex.Message });
            }
        }

        // DELETE api/datasets/5
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var item = await _db.ParameterSets.FindAsync(id);
            if (item == null) return NotFound();
            _db.ParameterSets.Remove(item);
            await _db.SaveChangesAsync();
            return NoContent();
        }

        // POST api/datasets/{id}/write  -- write parameter set back to OPC UA
        [HttpPost("{id}/write")]
        public async Task<IActionResult> WriteToOpc(int id)
        {
            var ps = await _db.ParameterSets.FindAsync(id);
            if (ps == null) return NotFound();
            Block? block = null;
            try
            {
                block = JsonSerializer.Deserialize<Block>(ps.JsonPayload);
            }
            catch (Exception ex)
            {
                return BadRequest(new { error = "Failed to deserialize parameter set payload", detail = ex.Message });
            }
            if (block == null) return BadRequest(new { error = "Parameter set payload is empty or invalid" });
            var ok = _opc.WriteBlock(ps.BlockIndex, block);
            if (!ok) return StatusCode(500, new { error = "OPC UA write failed or server unreachable" });
            return Ok(new { result = "written", id = ps.Id, blockIndex = ps.BlockIndex });
        }
    }
}
