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
    private readonly NodeMapping _mapping;
    private readonly ILogger<ParametersController> _logger;

    public ParametersController(OpcUaService opc, NodeMapping mapping, ILogger<ParametersController> logger)
    {
        _opc = opc;
        _mapping = mapping;
        _logger = logger;
    }

    /// <summary>
    /// Get all blocks with their group structure from the mapping (does not require OPC UA connection).
    /// Returns the parameter structure for all blocks 1-4.
    /// </summary>
    [HttpGet]
    public ActionResult<List<Block>> GetAll()
    {
        var blocks = new List<Block>();
        for (int i = 1; i <= 4; i++)
        {
            var block = GetBlockFromMapping(i);
            blocks.Add(block);
        }
        return blocks;
    }

    /// <summary>
    /// Get a specific block with its group structure from the mapping (does not require OPC UA connection).
    /// Returns the parameter structure for the specified block.
    /// </summary>
    [HttpGet("{index}")]
    public ActionResult<Block> GetBlock(int index)
    {
        if (index < 1 || index > 4)
            return BadRequest("block index must be 1..4");
        return GetBlockFromMapping(index);
    }

    /// <summary>
    /// Helper method to create a Block from the mapping data without requiring OPC UA connection.
    /// This allows the frontend to display the group structure even when OPC UA is not available.
    /// </summary>
    private Block GetBlockFromMapping(int index)
    {
        var block = new Block { Index = index };
        var mappingGroups = _mapping.GetGroupsForBlock(index);
        
        foreach (var (groupKey, parameters) in mappingGroups)
        {
            var paramList = new List<Parameter>();
            foreach (var (paramName, nodeId) in parameters)
            {
                paramList.Add(new Parameter 
                { 
                    Name = paramName, 
                    Value = string.Empty // No value since we're not reading from OPC UA
                });
            }
            block.Groups[groupKey] = paramList;
        }
        
        return block;
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
    }

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
        // some clients encode the '/' as %2F - ensure we decode the incoming path segment
        var decoded = Uri.UnescapeDataString(groupKey);
        _logger?.LogInformation(
            "GetGroup called for block={Index} raw='{Raw}' decoded='{Decoded}'",
            index,
            groupKey,
            decoded
        );

        // log available mapping groups for this block to aid debugging
        try
        {
            var groups = _mapping.GetGroupsForBlock(index).Keys.OrderBy(k => k).ToList();
            _logger?.LogInformation(
                "Available mapping groups for block {Block}: {Groups}",
                index,
                string.Join(",", groups)
            );
        }
        catch (Exception ex)
        {
            _logger?.LogDebug(ex, "Failed to list mapping groups for block {Block}", index);
        }

        var list = _opc.ReadGroup(index, decoded);
        if (list == null || list.Count == 0)
        {
            _logger?.LogInformation(
                "ReadGroup returned {Count} entries for block={Index} group='{Group}'",
                list?.Count ?? 0,
                index,
                decoded
            );
        }
        return list ?? new List<Parameter>();
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
