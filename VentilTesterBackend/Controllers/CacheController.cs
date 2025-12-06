using Microsoft.AspNetCore.Mvc;
using VentilTesterBackend.Models;
using VentilTesterBackend.Services;

namespace VentilTesterBackend.Controllers;

[ApiController]
[Route("api/cache")]
public class CacheController : ControllerBase
{
    private readonly CacheService _cacheService;
    private readonly ILogger<CacheController> _logger;

    public CacheController(
        CacheService cacheService,
        ILogger<CacheController> logger)
    {
        _cacheService = cacheService;
        _logger = logger;
    }

    /// <summary>
    /// Get cached data for a specific block
    /// GET /api/cache/{blockIndex}
    /// </summary>
    [HttpGet("{blockIndex}")]
    public ActionResult<CacheData> GetCachedData(int blockIndex)
    {
        if (blockIndex < 1 || blockIndex > 4)
        {
            return BadRequest("Block index must be between 1 and 4");
        }

        var data = _cacheService.GetCachedData(blockIndex);
        if (data == null)
        {
            return NotFound($"No cached data available for block {blockIndex}");
        }

        return Ok(data);
    }

    /// <summary>
    /// Get cached data for all blocks
    /// GET /api/cache
    /// </summary>
    [HttpGet]
    public ActionResult<Dictionary<int, CacheData>> GetAllCachedData()
    {
        var data = _cacheService.GetAllCachedData();
        return Ok(data);
    }

    /// <summary>
    /// Get cache service status
    /// GET /api/testoverview/status
    /// </summary>
    [HttpGet("status")]
    public ActionResult<object> GetStatus()
    {
        return Ok(new
        {
            IsEnabled = _cacheService.IsEnabled,
            UpdateIntervalMs = _cacheService.UpdateIntervalMs,
            CachedBlocks = _cacheService.GetAllCachedData().Keys.ToList()
        });
    }

    /// <summary>
    /// Start the cache service
    /// POST /api/testoverview/start
    /// </summary>
    [HttpPost("start")]
    public ActionResult Start()
    {
        try
        {
            _cacheService.Start();
            return Ok(new { Message = "TestOverview cache service started" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to start TestOverview cache service");
            return StatusCode(500, new { Error = ex.Message });
        }
    }

    /// <summary>
    /// Stop the cache service
    /// POST /api/testoverview/stop
    /// </summary>
    [HttpPost("stop")]
    public ActionResult Stop()
    {
        try
        {
            _cacheService.Stop();
            return Ok(new { Message = "TestOverview cache service stopped" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to stop TestOverview cache service");
            return StatusCode(500, new { Error = ex.Message });
        }
    }

    /// <summary>
    /// Update the cache interval
    /// POST /api/testoverview/interval?ms=2000
    /// </summary>
    [HttpPost("interval")]
    public ActionResult SetInterval([FromQuery] int ms)
    {
        if (ms < 500)
        {
            return BadRequest("Interval must be at least 500ms");
        }

        _cacheService.UpdateIntervalMs = ms;
        return Ok(new { Message = $"Update interval set to {ms}ms" });
    }
}
