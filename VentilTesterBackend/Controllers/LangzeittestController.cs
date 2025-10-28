using Microsoft.AspNetCore.Mvc;
using VentilTesterBackend.Services;
using VentilTesterBackend.Models;

namespace VentilTesterBackend.Controllers;

[ApiController]
[Route("api/langzeittest")]
public class LangzeittestController : ControllerBase
{
    private readonly OpcUaService _opc;
    private readonly ILogger<LangzeittestController> _log;

    public LangzeittestController(OpcUaService opc, ILogger<LangzeittestController> log)
    {
        _opc = opc;
        _log = log;
    }

    // GET /api/langzeittest/{block}
    [HttpGet("{blockIndex}")]
    public ActionResult<LangzeittestBlockData> GetBlock(int blockIndex)
    {
        if (blockIndex < 1 || blockIndex > 4) return BadRequest("block index must be 1..4");
        _log?.LogInformation("LangzeittestController.GetBlock {Block}", blockIndex);

        // mapping group name derived from Mapping parser: DB_Daten_Langzeittest_1-4 -> Daten_Langzeittest
        var groupKey = "Daten_Langzeittest";
        var items = _opc.ReadGroup(blockIndex, groupKey);

        var model = new LangzeittestBlockData { BlockIndex = blockIndex };
        int idx = 1;
        foreach (var p in items)
        {
            model.Ventils.Add(new LangzeittestVentil { Index = idx++, Name = p.Name, Value = p.Value });
        }

        return Ok(model);
    }
}
