using Microsoft.AspNetCore.Mvc;
using VentilTesterBackend.Services;

namespace VentilTesterBackend.Controllers;

[ApiController]
[Route("api/[controller]")]
public class MeasurementMonitoringController : ControllerBase
{
    private readonly MeasurementDataService _measurementDataService;
    private readonly ILogger<MeasurementMonitoringController> _logger;

    public MeasurementMonitoringController(
        MeasurementDataService measurementDataService,
        ILogger<MeasurementMonitoringController> logger)
    {
        _measurementDataService = measurementDataService;
        _logger = logger;
    }

    /// <summary>
    /// Set the active test run for a block
    /// </summary>
    [HttpPost("active-testrun")]
    public ActionResult SetActiveTestRun([FromBody] SetActiveTestRunRequest request)
    {
        _measurementDataService.SetActiveTestRun(request.BlockIndex, request.MessID);
        _logger.LogInformation("Set active test run MessID {MessID} for block {Block}", 
            request.MessID, request.BlockIndex);
        return Ok(new { message = "Active test run set successfully" });
    }

    /// <summary>
    /// Get the active test run for a block
    /// </summary>
    [HttpGet("active-testrun")]
    public ActionResult<int?> GetActiveTestRun([FromQuery] int blockIndex)
    {
        var messID = _measurementDataService.GetActiveTestRun(blockIndex);
        return Ok(new { blockIndex, activeTestRunMessID = messID });
    }

    /// <summary>
    /// Clear the active test run for a block
    /// </summary>
    [HttpDelete("active-testrun")]
    public ActionResult ClearActiveTestRun([FromQuery] int blockIndex)
    {
        _measurementDataService.ClearActiveTestRun(blockIndex);
        _logger.LogInformation("Cleared active test run for block {Block}", blockIndex);
        return Ok(new { message = "Active test run cleared successfully" });
    }

    /// <summary>
    /// Get monitoring status
    /// </summary>
    [HttpGet("status")]
    public ActionResult GetStatus()
    {
        return Ok(new
        {
            enabled = _measurementDataService.IsEnabled,
            pollingIntervalMs = _measurementDataService.PollingIntervalMs,
            monitoredGroups = _measurementDataService.MonitoredGroups
        });
    }

    /// <summary>
    /// Start monitoring
    /// </summary>
    [HttpPost("start")]
    public ActionResult StartMonitoring()
    {
        _measurementDataService.Start();
        return Ok(new { message = "Monitoring started" });
    }

    /// <summary>
    /// Stop monitoring
    /// </summary>
    [HttpPost("stop")]
    public ActionResult StopMonitoring()
    {
        _measurementDataService.Stop();
        return Ok(new { message = "Monitoring stopped" });
    }
}

public class SetActiveTestRunRequest
{
    public int BlockIndex { get; set; }
    public int MessID { get; set; }
}
