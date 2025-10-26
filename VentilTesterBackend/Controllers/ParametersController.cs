using Microsoft.AspNetCore.Mvc;
using VentilTesterBackend.Models;
using VentilTesterBackend.Services;

namespace VentilTesterBackend.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ParametersController : ControllerBase
{
    private readonly OpcUaService _opc;

    public ParametersController(OpcUaService opc)
    {
        _opc = opc;
    }

    [HttpGet]
    public ActionResult<List<Block>> GetAll()
    {
        return _opc.ReadAllBlocks();
    }

    [HttpGet("{index}")]
    public ActionResult<Block> GetBlock(int index)
    {
        if (index < 1 || index > 4) return BadRequest("block index must be 1..4");
        return _opc.ReadBlock(index);
    }

    [HttpPost("{index}")]
    public ActionResult WriteBlock(int index, [FromBody] Block block)
    {
        if (index < 1 || index > 4) return BadRequest("block index must be 1..4");
        var ok = _opc.WriteBlock(index, block);
        if (!ok) return StatusCode(500, "Write failed or server unreachable");
        return Ok();
    }
}
