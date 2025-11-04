using System.Text.Json;
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

    /*[HttpGet]
    public ActionResult<List<Block>> GetAll()
    {
        return _opc.ReadAllBlocks();
    }

    [HttpGet("{index}")]
    public ActionResult<Block> GetBlock(int index)
    {
        if (index < 1 || index > 4)
            return BadRequest("block index must be 1..4");
        return _opc.ReadBlock(index);
    }

    [HttpPost("{index}")]
    public ActionResult WriteBlock(int index, [FromBody] Block block)
    {
        if (index < 1 || index > 4)
            return BadRequest("block index must be 1..4");
        var ok = _opc.WriteBlock(index, block);
        if (!ok)
            return StatusCode(500, "Write failed or server unreachable");
        return Ok();
    }

    /// <summary>
    /// Read a single parameter value. Provide group and name as query parameters.
    /// Example: GET /api/parameters/1/value?group=AllgemeineParameter&name=ParamX
    /// </summary>
    [HttpGet("{index}/value")]
    public ActionResult<Parameter> GetParameter(
        int index,
        [FromQuery] string group,
        [FromQuery] string name
    )
    {
        if (index < 1 || index > 4)
            return BadRequest("block index must be 1..4");
        if (string.IsNullOrEmpty(group) || string.IsNullOrEmpty(name))
            return BadRequest("group and name query parameters required");
        var p = _opc.ReadParameter(index, group, name);
        if (p == null)
            return NotFound();
        return p;
    }*/

    /// <summary>
    /// Write a single parameter value. Provide group and name as query parameters and JSON body { value: "..." }.
    /// Example: POST /api/parameters/1/value?group=AllgemeineParameter&name=ParamX  with body { "value": "123" }
    /// </summary>
    [HttpPost("{index}/value")]
    public ActionResult WriteParameter(
        int index,
        [FromQuery] string group,
        [FromQuery] string name,
        [FromBody] JsonElement body
    )
    {
        if (index < 1 || index > 4)
            return BadRequest("block index must be 1..4");
        if (string.IsNullOrEmpty(group) || string.IsNullOrEmpty(name))
            return BadRequest("group and name query parameters required");
        string? value = null;
        try
        {
            value = body.GetProperty("value").GetString();
        }
        catch { }
        if (value == null)
            return BadRequest("body must contain a JSON property 'value'");
        var ok = _opc.WriteParameter(index, group, name, value);
        if (!ok)
            return StatusCode(500, "Write failed or server unreachable");
        return Ok();
    }

    /// <summary>
    /// Read all parameters for a specific group in a block.
    /// Example: GET /api/parameters/1/group/AllgemeineParameter
    /// For subgroup keys with slashes use the catch-all route, e.g. /api/parameters/1/group/Konfiguration_Detailtest/Strom
    /// </summary>
    [HttpGet("{index}/group/{*groupKey}")]
    public ActionResult<List<Parameter>> GetGroup(int index, string groupKey)
    {
        if (index < 1 || index > 4)
            return BadRequest("block index must be 1..4");
        if (string.IsNullOrEmpty(groupKey))
            return BadRequest("groupKey required");
        var list = _opc.ReadGroup(index, groupKey);
        return list;
    }

    /// <summary>
    /// Write multiple parameters for a specific group in a block.
    /// POST body: JSON array of { name: string, value: string }
    /// Example: POST /api/parameters/1/group/AllgemeineParameter
    /// </summary>
    [HttpPost("{index}/group/{*groupKey}")]
    public ActionResult WriteGroup(
        int index,
        string groupKey,
        [FromBody] List<Parameter> parameters
    )
    {
        if (index < 1 || index > 4)
            return BadRequest("block index must be 1..4");
        if (string.IsNullOrEmpty(groupKey))
            return BadRequest("groupKey required");
        if (parameters == null || parameters.Count == 0)
            return BadRequest("body must be an array of parameters");
        var ok = _opc.WriteGroup(index, groupKey, parameters);
        if (!ok)
            return StatusCode(500, "Write failed or server unreachable");
        return Ok();
    }
}
