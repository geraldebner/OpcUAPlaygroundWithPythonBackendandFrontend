using Microsoft.AspNetCore.Mvc;
using VentilTesterBackend.Services;

namespace VentilTesterBackend.Controllers;

[ApiController]
[Route("api/[controller]")]
public class StatusController : ControllerBase
{
    private readonly OpcUaService _opc;
    private readonly NodeMapping _mapping;

    public StatusController(OpcUaService opc, NodeMapping mapping)
    {
        _opc = opc;
        _mapping = mapping;
    }

    [HttpGet]
    public ActionResult<object> Get()
    {
        // Provide a quick health/status summary
        var connected = _opc != null; // best-effort; OpcUaService logs connection
        return new { backend = "ok", opcua = connected };
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
