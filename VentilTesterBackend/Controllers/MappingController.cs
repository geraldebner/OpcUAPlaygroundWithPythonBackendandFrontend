using Microsoft.AspNetCore.Mvc;
using VentilTesterBackend.Services;

namespace VentilTesterBackend.Controllers;


[ApiController]
[Route("api/[controller]")]
public class MappingController : ControllerBase
{
    private readonly NodeMapping _mapping;
    private readonly Microsoft.Extensions.Logging.ILogger<MappingController> _logger;

    public MappingController(NodeMapping mapping, Microsoft.Extensions.Logging.ILogger<MappingController> logger)
    {
        _mapping = mapping;
        _logger = logger;
        _logger.LogDebug("MappingController constructed");
    }

    [HttpGet]
    public ActionResult<object> GetAllBlocks()
    {
        _logger.LogInformation("GetAllBlocks called");
        // Try block indices 1..16 to discover available blocks (mapping uses 1..4 but be flexible)
        var result = new List<object>();
        for (int i = 1; i <= 16; i++)
        {
            var groups = _mapping.GetGroupsForBlock(i);
            if (groups != null && groups.Count > 0)
            {
                _logger.LogDebug("Found {count} groups for block {block}", groups.Count, i);
                result.Add(new { block = i, groups = groups.Keys });
            }
            else
            {
                _logger.LogTrace("No mapping groups found for block {block}", i);
            }
        }
        _logger.LogInformation("GetAllBlocks returning {blocks} blocks", result.Count);
        return Ok(result);
    }

    [HttpGet("{blockIndex}")]
    public ActionResult<object> GetBlock(int blockIndex)
    {
        _logger.LogInformation("GetBlock called for block {block}", blockIndex);
        var groups = _mapping.GetGroupsForBlock(blockIndex);
        if (groups == null || groups.Count == 0)
        {
            _logger.LogWarning("GetBlock: no mapping groups found for block {block}", blockIndex);
            return NotFound();
        }

        var outGroups = groups.ToDictionary(
            kv => kv.Key,
            kv => kv.Value.Select(p => new { name = p.Param, nodeId = p.NodeId }).ToList()
        );

        _logger.LogDebug("GetBlock returning {groupCount} groups for block {block}", outGroups.Count, blockIndex);
        return Ok(new { block = blockIndex, groups = outGroups });
    }
}
