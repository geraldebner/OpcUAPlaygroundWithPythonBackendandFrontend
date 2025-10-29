using Microsoft.AspNetCore.Mvc;
using VentilTesterBackend.Services;
using VentilTesterBackend.Data;

namespace VentilTesterBackend.Controllers;

[ApiController]
[Route("api/[controller]")]
public class StatusController : ControllerBase
{
    private readonly OpcUaService _opc;
    private readonly NodeMapping _mapping;
    private readonly AppDbContext _db;

    public StatusController(AppDbContext db, OpcUaService opc, NodeMapping mapping)
    {
        _db = db;
        _opc = opc;
        _mapping = mapping;
    }

    [HttpGet]
    public ActionResult<object> Get()
    {
        // Provide a quick health/status summary
        bool dbOk = false;
        try { dbOk = _db.Database.CanConnect(); } catch { dbOk = false; }

        var opc = new {
            connected = _opc?.IsConnected ?? false,
            endpoint = _opc?.Endpoint ?? string.Empty
        };

        return new { backend = "ok", opcua = opc, database = new { connected = dbOk } };
    }

    [HttpGet("sample/{blockIndex}")]
    public ActionResult<object> Sample(int blockIndex = 1)
    {
        try
        {
            // Return the backend's current view of the requested block (what the UI will see)
            var block = _opc.ReadBlock(blockIndex);
            return Ok(new { connected = true, block });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { error = ex.Message });
        }
    }
}
