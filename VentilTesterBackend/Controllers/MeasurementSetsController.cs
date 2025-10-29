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
    public class MeasurementSetsController : ControllerBase
    {
        private readonly AppDbContext _db;
        private readonly OpcUaService _opc;

        public MeasurementSetsController(AppDbContext db, OpcUaService opc)
        {
            _db = db;
            _opc = opc;
        }

        // GET api/measurementsets?blockIndex=1
        [HttpGet]
        public async Task<IActionResult> Get([FromQuery] int? blockIndex)
        {
            IQueryable<MeasurementSet> q = _db.MeasurementSets;
            if (blockIndex.HasValue)
                q = q.Where(m => m.BlockIndex == blockIndex.Value);
            var list = await q.OrderByDescending(m => m.CreatedAt).ToListAsync();
            return Ok(list.Select(m => new { m.Id, m.Name, m.BlockIndex, m.CreatedAt, m.Comment }));
        }

        // GET api/measurementsets/5
        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var item = await _db.MeasurementSets.FindAsync(id);
            if (item == null) return NotFound();
            return Ok(new { item.Id, item.Name, item.BlockIndex, item.CreatedAt, item.Comment, payload = item.JsonPayload });
        }

        // POST api/measurementsets
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateMeasurementSetRequest req)
        {
            if (string.IsNullOrWhiteSpace(req.Name)) return BadRequest(new { error = "Name required" });
            var m = new MeasurementSet
            {
                Name = req.Name,
                BlockIndex = req.BlockIndex,
                CreatedAt = DateTime.UtcNow,
                Comment = req.Comment,
                JsonPayload = req.JsonPayload ?? "{}"
            };
            _db.MeasurementSets.Add(m);
            await _db.SaveChangesAsync();
            return CreatedAtAction(nameof(GetById), new { id = m.Id }, new { m.Id, m.Name, m.BlockIndex, m.CreatedAt });
        }

        // DELETE api/measurementsets/5
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var item = await _db.MeasurementSets.FindAsync(id);
            if (item == null) return NotFound();
            _db.MeasurementSets.Remove(item);
            await _db.SaveChangesAsync();
            return NoContent();
        }

        // POST api/measurementsets/{id}/restore
        [HttpPost("{id}/restore")]
        public async Task<IActionResult> Restore(int id)
        {
            var item = await _db.MeasurementSets.FindAsync(id);
            if (item == null) return NotFound();
            Block? block = null;
            try
            {
                block = JsonSerializer.Deserialize<Block>(item.JsonPayload);
            }
            catch (Exception ex)
            {
                return BadRequest(new { error = "Failed to deserialize snapshot payload", detail = ex.Message });
            }
            if (block == null) return BadRequest(new { error = "Snapshot payload is empty or invalid" });

            var ok = _opc.WriteBlock(item.BlockIndex, block);
            if (!ok) return StatusCode(500, new { error = "OPC UA write failed or server unreachable" });
            return Ok(new { result = "restored", id = item.Id, blockIndex = item.BlockIndex });
        }
    }

    public class CreateMeasurementSetRequest
    {
        public string Name { get; set; } = string.Empty;
        public int BlockIndex { get; set; }
        public string? Comment { get; set; }
        public string? JsonPayload { get; set; }
    }
}
