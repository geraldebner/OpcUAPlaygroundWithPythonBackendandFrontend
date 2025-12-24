using Microsoft.AspNetCore.Mvc;
using VentilTesterBackend.Models;
using VentilTesterBackend.Services;

namespace VentilTesterBackend.Controllers;

[ApiController]
[Route("api/[controller]")]
public class TestRunsController : ControllerBase
{
    private readonly TestRunService _testRunService;
    private readonly ILogger<TestRunsController> _logger;

    public TestRunsController(TestRunService testRunService, ILogger<TestRunsController> logger)
    {
        _testRunService = testRunService;
        _logger = logger;
    }

    /// <summary>
    /// Get the next available MessID
    /// </summary>
    [HttpGet("next-messid")]
    public async Task<ActionResult<int>> GetNextMessID()
    {
        var nextMessID = await _testRunService.GetNextMessIDAsync();
        return Ok(nextMessID);
    }

    /// <summary>
    /// Get all test runs, optionally filtered by block index
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<List<TestRun>>> GetAllTestRuns([FromQuery] int? blockIndex = null)
    {
        var testRuns = await _testRunService.GetAllTestRunsAsync(blockIndex);
        return Ok(testRuns);
    }

    /// <summary>
    /// Get a specific test run by MessID
    /// </summary>
    [HttpGet("{messID}")]
    public async Task<ActionResult<TestRun>> GetTestRun(int messID)
    {
        var testRun = await _testRunService.GetTestRunAsync(messID);
        if (testRun == null)
        {
            return NotFound(new { message = $"Test run with MessID {messID} not found" });
        }
        return Ok(testRun);
    }

    /// <summary>
    /// Get the current active test run for a specific block
    /// </summary>
    [HttpGet("active")]
    public async Task<ActionResult<TestRun>> GetActiveTestRun([FromQuery] int blockIndex)
    {
        var testRun = await _testRunService.GetActiveTestRunAsync(blockIndex);
        if (testRun == null)
        {
            return NotFound(new { message = $"No active test run found for block {blockIndex}" });
        }
        return Ok(testRun);
    }

    /// <summary>
    /// Create a new test run
    /// </summary>
    [HttpPost]
    public async Task<ActionResult<TestRun>> CreateTestRun([FromBody] CreateTestRunRequest request)
    {
        try
        {
            var testRun = await _testRunService.CreateTestRunAsync(
                request.TestType,
                request.BlockIndex,
                request.VentilkonfigurationId,
                request.KonfigurationLangzeittestId,
                request.KonfigurationDetailtestId,
                request.Comment,
                request.AdditionalInfo
            );

            return CreatedAtAction(nameof(GetTestRun), new { messID = testRun.MessID }, testRun);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating test run");
            return StatusCode(500, new { message = "Error creating test run", error = ex.Message });
        }
    }

    /// <summary>
    /// Update a test run
    /// </summary>
    [HttpPut("{messID}")]
    public async Task<ActionResult> UpdateTestRun(int messID, [FromBody] UpdateTestRunRequest request)
    {
        var testRun = await _testRunService.GetTestRunAsync(messID);
        if (testRun == null)
        {
            return NotFound(new { message = $"Test run with MessID {messID} not found" });
        }

        // Update fields
        if (!string.IsNullOrEmpty(request.TestType))
            testRun.TestType = request.TestType;
        
        if (request.VentilkonfigurationId.HasValue)
            testRun.VentilkonfigurationId = request.VentilkonfigurationId;
        
        if (request.KonfigurationLangzeittestId.HasValue)
            testRun.KonfigurationLangzeittestId = request.KonfigurationLangzeittestId;
        
        if (request.KonfigurationDetailtestId.HasValue)
            testRun.KonfigurationDetailtestId = request.KonfigurationDetailtestId;
        
        if (request.Comment != null)
            testRun.Comment = request.Comment;
        
        if (request.AdditionalInfo != null)
            testRun.AdditionalInfo = request.AdditionalInfo;
        
        if (!string.IsNullOrEmpty(request.Status))
            testRun.Status = request.Status;
        
        if (request.CompletedAt.HasValue)
            testRun.CompletedAt = request.CompletedAt;

        var success = await _testRunService.UpdateTestRunAsync(testRun);
        if (!success)
        {
            return StatusCode(500, new { message = "Failed to update test run" });
        }

        return Ok(testRun);
    }

    /// <summary>
    /// Start a test run (set status to Running)
    /// </summary>
    [HttpPost("{messID}/start")]
    public async Task<ActionResult> StartTestRun(int messID)
    {
        var success = await _testRunService.StartTestRunAsync(messID);
        if (!success)
        {
            return NotFound(new { message = $"Test run with MessID {messID} not found" });
        }
        return Ok(new { message = "Test run started successfully" });
    }

    /// <summary>
    /// Complete a test run (set status to Completed)
    /// </summary>
    [HttpPost("{messID}/complete")]
    public async Task<ActionResult> CompleteTestRun(int messID)
    {
        var success = await _testRunService.CompleteTestRunAsync(messID);
        if (!success)
        {
            return NotFound(new { message = $"Test run with MessID {messID} not found" });
        }
        return Ok(new { message = "Test run completed successfully" });
    }

    /// <summary>
    /// Fail a test run (set status to Failed)
    /// </summary>
    [HttpPost("{messID}/fail")]
    public async Task<ActionResult> FailTestRun(int messID)
    {
        var success = await _testRunService.FailTestRunAsync(messID);
        if (!success)
        {
            return NotFound(new { message = $"Test run with MessID {messID} not found" });
        }
        return Ok(new { message = "Test run marked as failed" });
    }

    /// <summary>
    /// Cancel a test run (set status to Cancelled)
    /// </summary>
    [HttpPost("{messID}/cancel")]
    public async Task<ActionResult> CancelTestRun(int messID)
    {
        var success = await _testRunService.CancelTestRunAsync(messID);
        if (!success)
        {
            return NotFound(new { message = $"Test run with MessID {messID} not found" });
        }
        return Ok(new { message = "Test run cancelled successfully" });
    }

    /// <summary>
    /// Delete a test run
    /// </summary>
    [HttpDelete("{messID}")]
    public async Task<ActionResult> DeleteTestRun(int messID)
    {
        var success = await _testRunService.DeleteTestRunAsync(messID);
        if (!success)
        {
            return NotFound(new { message = $"Test run with MessID {messID} not found" });
        }
        return Ok(new { message = "Test run deleted successfully" });
    }
}

// Request DTOs
public class CreateTestRunRequest
{
    public string TestType { get; set; } = string.Empty;
    public int BlockIndex { get; set; }
    public int? VentilkonfigurationId { get; set; }
    public int? KonfigurationLangzeittestId { get; set; }
    public int? KonfigurationDetailtestId { get; set; }
    public string? Comment { get; set; }
    public string? AdditionalInfo { get; set; }
}

public class UpdateTestRunRequest
{
    public string? TestType { get; set; }
    public int? VentilkonfigurationId { get; set; }
    public int? KonfigurationLangzeittestId { get; set; }
    public int? KonfigurationDetailtestId { get; set; }
    public string? Comment { get; set; }
    public string? AdditionalInfo { get; set; }
    public string? Status { get; set; }
    public DateTime? CompletedAt { get; set; }
}
