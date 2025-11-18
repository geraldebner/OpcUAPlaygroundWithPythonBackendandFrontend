using Microsoft.AspNetCore.Mvc;
using VentilTesterBackend.Services;

namespace VentilTesterBackend.Controllers;

[ApiController]
[Route("api/[controller]")]
public class SettingsController : ControllerBase
{
    private readonly MeasurementDataService _measurementService;
    private readonly ILogger<SettingsController> _logger;

    public SettingsController(
        MeasurementDataService measurementService,
        ILogger<SettingsController> logger)
    {
        _measurementService = measurementService;
        _logger = logger;
    }

    /// <summary>
    /// Get current measurement service settings
    /// </summary>
    [HttpGet("measurement-service")]
    public ActionResult<object> GetMeasurementServiceSettings()
    {
        return Ok(new
        {
            enabled = _measurementService.IsEnabled,
            pollingIntervalMs = _measurementService.PollingIntervalMs,
            monitoredGroups = _measurementService.MonitoredGroups
        });
    }

    /// <summary>
    /// Start the measurement data monitoring service
    /// </summary>
    [HttpPost("measurement-service/start")]
    public ActionResult StartMeasurementService()
    {
        try
        {
            _measurementService.Start();
            _logger.LogInformation("Measurement service started via API");
            return Ok(new { message = "Measurement service started", enabled = true });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to start measurement service");
            return StatusCode(500, new { error = ex.Message });
        }
    }

    /// <summary>
    /// Stop the measurement data monitoring service
    /// </summary>
    [HttpPost("measurement-service/stop")]
    public ActionResult StopMeasurementService()
    {
        try
        {
            _measurementService.Stop();
            _logger.LogInformation("Measurement service stopped via API");
            return Ok(new { message = "Measurement service stopped", enabled = false });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to stop measurement service");
            return StatusCode(500, new { error = ex.Message });
        }
    }

    /// <summary>
    /// Update measurement service polling interval
    /// </summary>
    [HttpPost("measurement-service/polling-interval")]
    public ActionResult SetPollingInterval([FromBody] SetPollingIntervalRequest request)
    {
        try
        {
            _measurementService.PollingIntervalMs = request.IntervalMs;
            _logger.LogInformation("Measurement service polling interval set to {Interval}ms", request.IntervalMs);
            return Ok(new { message = "Polling interval updated", pollingIntervalMs = _measurementService.PollingIntervalMs });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to set polling interval");
            return StatusCode(500, new { error = ex.Message });
        }
    }

    public class SetPollingIntervalRequest
    {
        public int IntervalMs { get; set; }
    }
}
