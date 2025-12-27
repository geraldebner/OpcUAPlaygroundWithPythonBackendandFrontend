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
        private readonly ILogger<MeasurementSetsController> _logger;

        public MeasurementSetsController(AppDbContext db, OpcUaService opc, ILogger<MeasurementSetsController> logger)
        {
            _db = db;
            _opc = opc;
            _logger = logger;
        }

        // GET api/measurementsets?blockIndex=1
        [HttpGet]
        public async Task<IActionResult> Get([FromQuery] int? blockIndex)
        {
            IQueryable<MeasurementSet> q = _db.MeasurementSets
                .Include(m => m.TestRun);
            
            if (blockIndex.HasValue)
                q = q.Where(m => m.BlockIndex == blockIndex.Value);
            
            var list = await q.OrderByDescending(m => m.CreatedAt).ToListAsync();
            
            return Ok(list.Select(m => new 
            { 
                m.Id, 
                m.Name, 
                m.BlockIndex, 
                m.CreatedAt, 
                m.Comment, 
                m.MessID,
                TestRun = m.TestRun != null ? new
                {
                    m.TestRun.MessID,
                    m.TestRun.TestType,
                    m.TestRun.Status,
                    m.TestRun.StartedAt,
                    m.TestRun.CompletedAt,
                    m.TestRun.Comment
                } : null
            }));
        }

        // GET api/measurementsets/5
        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var item = await _db.MeasurementSets
                .Include(m => m.TestRun)
                    .ThenInclude(tr => tr.VentilConfigs)
                .FirstOrDefaultAsync(m => m.Id == id);
            
            if (item == null) return NotFound();
            
            _logger.LogInformation(
                "MeasurementSet {Id}: Name={Name}, MessID={MessID}, TestRun is {TestRunStatus}",
                item.Id,
                item.Name,
                item.MessID,
                item.TestRun == null ? "NULL" : $"MessID={item.TestRun.MessID}"
            );
            
            return Ok(new 
            { 
                item.Id, 
                item.Name, 
                item.BlockIndex, 
                item.CreatedAt, 
                item.Comment, 
                MessID = item.MessID,
                payload = item.JsonPayload,
                TestRun = item.TestRun != null ? new
                {
                    item.TestRun.MessID,
                    item.TestRun.TestType,
                    item.TestRun.Status,
                    item.TestRun.StartedAt,
                    item.TestRun.CompletedAt,
                    item.TestRun.Comment,
                    VentilConfigs = item.TestRun.VentilConfigs.Select(vc => new
                    {
                        vc.VentilNumber,
                        vc.Enabled,
                        vc.Comment,
                        vc.StartCounterValue
                    }).ToList()
                } : null
            });
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
                MessID = req.MessID,
                JsonPayload = req.JsonPayload ?? "{}"
            };
            _db.MeasurementSets.Add(m);
            await _db.SaveChangesAsync();
            return CreatedAtAction(nameof(GetById), new { id = m.Id }, new { m.Id, m.Name, m.BlockIndex, m.CreatedAt, m.Comment, m.MessID });
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
        public int? MessID { get; set; }
        public string? JsonPayload { get; set; }
    }
}
