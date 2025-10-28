using Microsoft.AspNetCore.Mvc;
using VentilTesterBackend.Services;
using VentilTesterBackend.Models;

namespace VentilTesterBackend.Controllers;

[ApiController]
[Route("api/strommessung")]
public class StrommessungController : ControllerBase
{
    private readonly OpcUaService _opc;
    private readonly NodeMapping _mapping;
    private readonly ILogger<StrommessungController> _log;

    public StrommessungController(OpcUaService opc, NodeMapping mapping, ILogger<StrommessungController> log)
    {
        _opc = opc;
        _mapping = mapping;
        _log = log;
    }

    private string? DetectStromGroupKey(int blockIndex)
    {
        try
        {
            var groups = _mapping.GetGroupsForBlock(blockIndex);
            if (groups == null || groups.Count == 0) return null;
            // prefer keys that contain Strom or Strommess
            var candidate = groups.Keys.FirstOrDefault(k => k.IndexOf("Strom", StringComparison.OrdinalIgnoreCase) >= 0 || k.IndexOf("Strommess", StringComparison.OrdinalIgnoreCase) >= 0);
            if (!string.IsNullOrEmpty(candidate)) return candidate;
            // prefer keys that contain Daten and Stromwords
            candidate = groups.Keys.FirstOrDefault(k => k.IndexOf("Daten", StringComparison.OrdinalIgnoreCase) >= 0 && k.IndexOf("Strom", StringComparison.OrdinalIgnoreCase) >= 0);
            if (!string.IsNullOrEmpty(candidate)) return candidate;
            // fall back to any key that contains "Daten"
            candidate = groups.Keys.FirstOrDefault(k => k.IndexOf("Daten", StringComparison.OrdinalIgnoreCase) >= 0);
            if (!string.IsNullOrEmpty(candidate)) return candidate;
            // otherwise return first key
            return groups.Keys.FirstOrDefault();
        }
        catch { return null; }
    }

    // GET /api/strommessung/status  -> status for all blocks
    [HttpGet("status")]
    public ActionResult<List<StrommessungBlockStatus>> GetStatusAll()
    {
        var res = new List<StrommessungBlockStatus>();
        for (int i = 1; i <= 4; i++)
        {
            res.Add(ReadBlockStatus(i));
        }
        return Ok(res);
    }

    // GET /api/strommessung/status/{block}
    [HttpGet("status/{blockIndex}")]
    public ActionResult<StrommessungBlockStatus> GetStatus(int blockIndex)
    {
        if (blockIndex < 1 || blockIndex > 4) return BadRequest("block index must be 1..4");
        return Ok(ReadBlockStatus(blockIndex));
    }

    private StrommessungBlockStatus ReadBlockStatus(int blockIndex)
    {
        // attempt to detect mapping group for strommessung
        var groupKey = DetectStromGroupKey(blockIndex);
        if (groupKey == null)
        {
            _log?.LogDebug("Strommessung: no mapping group found for block {Block}", blockIndex);
            return new StrommessungBlockStatus { BlockIndex = blockIndex, Status = "unknown", DatenReady = false };
        }
        var items = _opc.ReadGroup(blockIndex, groupKey);
        var status = "unknown";
        var datenReady = false;
        foreach (var p in items)
        {
            if (p.Name.IndexOf("Status", StringComparison.OrdinalIgnoreCase) >= 0)
            {
                status = p.Value ?? string.Empty;
            }
            if (p.Name.IndexOf("DatenReady", StringComparison.OrdinalIgnoreCase) >= 0 || p.Name.IndexOf("Daten_Ready", StringComparison.OrdinalIgnoreCase) >= 0)
            {
                if (bool.TryParse(p.Value, out var b)) datenReady = b;
                else if (p.Value == "1") datenReady = true;
                else datenReady = false;
            }
        }
        return new StrommessungBlockStatus { BlockIndex = blockIndex, Status = status, DatenReady = datenReady };
    }

    // GET /api/strommessung/block/{blockIndex} -> all ventil data for block
    [HttpGet("block/{blockIndex}")]
    public ActionResult<StrommessungBlockData> GetBlockData(int blockIndex)
    {
        if (blockIndex < 1 || blockIndex > 4) return BadRequest("block index must be 1..4");
    var groupKey = DetectStromGroupKey(blockIndex);
    if (groupKey == null) return Ok(new StrommessungBlockData { BlockIndex = blockIndex });
    var items = _opc.ReadGroup(blockIndex, groupKey);
        var model = new StrommessungBlockData { BlockIndex = blockIndex };
        int idx = 1;
        foreach (var p in items)
        {
            model.Ventils.Add(new StrommessungVentil { Index = idx++, Name = p.Name, Value = p.Value });
        }
        return Ok(model);
    }

    // GET /api/strommessung/ventil/{blockIndex}/{ventilIndex}
    [HttpGet("ventil/{blockIndex}/{ventilIndex}")]
    public ActionResult<StrommessungVentil?> GetVentil(int blockIndex, int ventilIndex)
    {
        if (blockIndex < 1 || blockIndex > 4) return BadRequest("block index must be 1..4");
        if (ventilIndex < 1) return BadRequest("ventil index must be >=1");
    var groupKey = DetectStromGroupKey(blockIndex);
    if (groupKey == null) return NotFound();
    var items = _opc.ReadGroup(blockIndex, groupKey);
        // try to find by number in the parameter name
        var match = items.FirstOrDefault(p => p.Name.IndexOf(ventilIndex.ToString(), StringComparison.OrdinalIgnoreCase) >= 0);
        if (match == null) return NotFound();
        return Ok(new StrommessungVentil { Index = ventilIndex, Name = match.Name, Value = match.Value });
    }

    // GET /api/strommessung/all -> all blocks data
    [HttpGet("all")]
    public ActionResult<List<StrommessungBlockData>> GetAll()
    {
        var res = new List<StrommessungBlockData>();
        for (int i = 1; i <= 4; i++)
        {
            var groupKey = DetectStromGroupKey(i);
            if (groupKey == null)
            {
                res.Add(new StrommessungBlockData { BlockIndex = i });
                continue;
            }
            var items = _opc.ReadGroup(i, groupKey);
            var model = new StrommessungBlockData { BlockIndex = i };
            int idx = 1;
            foreach (var p in items)
            {
                model.Ventils.Add(new StrommessungVentil { Index = idx++, Name = p.Name, Value = p.Value });
            }
            res.Add(model);
        }
        return Ok(res);
    }
}
