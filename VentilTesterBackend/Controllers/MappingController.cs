using Microsoft.AspNetCore.Mvc;
using VentilTesterBackend.Services;

namespace VentilTesterBackend.Controllers;

/*
[ApiController]
[Route("api/[controller]")]
public class MappingController : ControllerBase
{
    private readonly NodeMapping _mapping;

    public MappingController(NodeMapping mapping)
    {
        _mapping = mapping;
    }

    [HttpGet]
    public ActionResult<object> GetAllBlocks()
    {
        // Try block indices 1..16 to discover available blocks (mapping uses 1..4 but be flexible)
        var result = new List<object>();
        for (int i = 1; i <= 16; i++)
        {
            var groups = _mapping.GetGroupsForBlock(i);
            if (groups != null && groups.Count > 0)
            {
                result.Add(new { block = i, groups = groups.Keys });
            }
        }
        return Ok(result);
    }

    [HttpGet("{blockIndex}")]
    public ActionResult<object> GetBlock(int blockIndex)
    {
        var groups = _mapping.GetGroupsForBlock(blockIndex);
        if (groups == null || groups.Count == 0) return NotFound();

        var outGroups = groups.ToDictionary(
            kv => kv.Key,
            kv => kv.Value.Select(p => new { name = p.Param, nodeId = p.NodeId }).ToList()
        );

        return Ok(new { block = blockIndex, groups = outGroups });
    }
}
*/