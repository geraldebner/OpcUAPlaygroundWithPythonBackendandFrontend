using Microsoft.EntityFrameworkCore;
using VentilTesterBackend.Data;
using VentilTesterBackend.Models;

namespace VentilTesterBackend.Services;

/// <summary>
/// Service for managing test runs (Prüfläufe)
/// </summary>
public class TestRunService
{
    private readonly AppDbContext _context;
    private readonly ILogger<TestRunService> _logger;
    private readonly OpcUaService _opcUaService;

    public TestRunService(AppDbContext context, ILogger<TestRunService> logger, OpcUaService opcUaService)
    {
        _context = context;
        _logger = logger;
        _opcUaService = opcUaService;
    }

    /// <summary>
    /// Get the next available MessID
    /// </summary>
    public async Task<int> GetNextMessIDAsync()
    {
        var maxMessID = await _context.TestRuns.MaxAsync(tr => (int?)tr.MessID);
        return (maxMessID ?? 0) + 1;
    }

    /// <summary>
    /// Create a new test run and return it with auto-incremented MessID
    /// </summary>
    public async Task<TestRun> CreateTestRunAsync(
        string testType,
        int blockIndex,
        int? ventilkonfigurationId = null,
        int? konfigurationLangzeittestId = null,
        int? konfigurationDetailtestId = null,
        string? comment = null,
        string? additionalInfo = null,
        List<TestRunVentilConfig>? ventilConfigs = null)
    {
        var nextMessID = await GetNextMessIDAsync();

        var testRun = new TestRun
        {
            MessID = nextMessID,
            TestType = testType,
            BlockIndex = blockIndex,
            StartedAt = DateTime.UtcNow,
            VentilkonfigurationId = ventilkonfigurationId,
            KonfigurationLangzeittestId = konfigurationLangzeittestId,
            KonfigurationDetailtestId = konfigurationDetailtestId,
            Comment = comment,
            AdditionalInfo = additionalInfo,
            Status = "Initialized"
        };

        _context.TestRuns.Add(testRun);
        await _context.SaveChangesAsync();

        // Add ventil configurations if provided
        if (ventilConfigs != null && ventilConfigs.Count > 0)
        {
            foreach (var config in ventilConfigs)
            {
                config.TestRunMessID = testRun.MessID;
                _context.TestRunVentilConfigs.Add(config);
            }
            await _context.SaveChangesAsync();
        }

        _logger.LogInformation("Created new test run with MessID {MessID}, Type: {TestType}, Block: {BlockIndex}, Ventils: {VentilCount}", 
            nextMessID, testType, blockIndex, ventilConfigs?.Count ?? 0);

        return testRun;
    }

    /// <summary>
    /// Get all test runs
    /// </summary>
    public async Task<List<TestRun>> GetAllTestRunsAsync(int? blockIndex = null)
    {
        var query = _context.TestRuns
            .Include(tr => tr.VentilkonfigurationParameterSet)
            .Include(tr => tr.KonfigurationLangzeittestParameterSet)
            .Include(tr => tr.KonfigurationDetailtestParameterSet)
            .Include(tr => tr.VentilConfigs)
            .AsQueryable();

        if (blockIndex.HasValue)
        {
            query = query.Where(tr => tr.BlockIndex == blockIndex.Value);
        }

        return await query.OrderByDescending(tr => tr.MessID).ToListAsync();
    }

    /// <summary>
    /// Get a specific test run by MessID
    /// </summary>
    public async Task<TestRun?> GetTestRunAsync(int messID)
    {
        return await _context.TestRuns
            .Include(tr => tr.VentilkonfigurationParameterSet)
            .Include(tr => tr.KonfigurationLangzeittestParameterSet)
            .Include(tr => tr.KonfigurationDetailtestParameterSet)
            .Include(tr => tr.VentilConfigs)
            .FirstOrDefaultAsync(tr => tr.MessID == messID);
    }

    /// <summary>
    /// Update test run status
    /// </summary>
    public async Task<bool> UpdateTestRunStatusAsync(int messID, string status, DateTime? completedAt = null)
    {
        var testRun = await _context.TestRuns.FindAsync(messID);
        if (testRun == null)
        {
            _logger.LogWarning("Test run with MessID {MessID} not found", messID);
            return false;
        }

        testRun.Status = status;
        if (completedAt.HasValue)
        {
            testRun.CompletedAt = completedAt.Value;
        }

        await _context.SaveChangesAsync();
        _logger.LogInformation("Updated test run {MessID} status to {Status}", messID, status);
        return true;
    }

    /// <summary>
    /// Update test run
    /// </summary>
    public async Task<bool> UpdateTestRunAsync(TestRun testRun)
    {
        var existing = await _context.TestRuns.FindAsync(testRun.MessID);
        if (existing == null)
        {
            return false;
        }

        _context.Entry(existing).CurrentValues.SetValues(testRun);
        await _context.SaveChangesAsync();
        return true;
    }

    /// <summary>
    /// Delete a test run
    /// </summary>
    public async Task<bool> DeleteTestRunAsync(int messID)
    {
        var testRun = await _context.TestRuns.FindAsync(messID);
        if (testRun == null)
        {
            return false;
        }

        _context.TestRuns.Remove(testRun);
        await _context.SaveChangesAsync();
        _logger.LogInformation("Deleted test run with MessID {MessID}", messID);
        return true;
    }

    /// <summary>
    /// Get the current active test run for a block (status = Running)
    /// </summary>
    public async Task<TestRun?> GetActiveTestRunAsync(int blockIndex)
    {
        return await _context.TestRuns
            .Include(tr => tr.VentilkonfigurationParameterSet)
            .Include(tr => tr.KonfigurationLangzeittestParameterSet)
            .Include(tr => tr.KonfigurationDetailtestParameterSet)
            .Where(tr => tr.BlockIndex == blockIndex && tr.Status == "Running")
            .OrderByDescending(tr => tr.MessID)
            .FirstOrDefaultAsync();
    }

    /// <summary>
    /// Start a test run (change status to Running)
    /// </summary>
    public async Task<bool> StartTestRunAsync(int messID)
    {
        // Fetch test run including ventil configs
        var testRun = await _context.TestRuns
            .Include(tr => tr.VentilConfigs)
            .FirstOrDefaultAsync(tr => tr.MessID == messID);

        if (testRun == null)
        {
            _logger.LogWarning("Test run with MessID {MessID} not found", messID);
            return false;
        }

        // Write start counter values to OPC UA for each ventil
        try
        {
            int blockIndex = testRun.BlockIndex;
            // If no configs provided, still initialize 1..16 to 0
            var configsByVentil = (testRun.VentilConfigs ?? new List<TestRunVentilConfig>())
                .ToDictionary(vc => vc.VentilNumber, vc => vc);

            for (int v = 1; v <= 16; v++)
            {
                int startValue = 0;
                if (configsByVentil.TryGetValue(v, out var cfg))
                {
                    startValue = cfg.StartCounterValue;
                }
                try
                {
                    // Group: Daten_Langzeittest; Param: ZaehlerVentil_{v}
                    var paramName = $"ZaehlerVentil_{v}";
                    _opcUaService.WriteNode(blockIndex, "Daten_Langzeittest", paramName, startValue.ToString());
                    _logger.LogInformation("Initialized OPC UA counter {Param} to {Value} for block {Block}", paramName, startValue, blockIndex);
                }
                catch (Exception ex)
                {
                    // Log and continue; do not fail entire start if a single write fails
                    _logger.LogWarning(ex, "Failed to write OPC UA counter for ventil {Ventil} on block {Block}", v, blockIndex);
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Error while initializing OPC UA start counters for test run {MessID}", messID);
        }

        // Now set status to Running
        return await UpdateTestRunStatusAsync(messID, "Running");
    }

    /// <summary>
    /// Complete a test run (change status to Completed)
    /// </summary>
    public async Task<bool> CompleteTestRunAsync(int messID)
    {
        return await UpdateTestRunStatusAsync(messID, "Completed", DateTime.UtcNow);
    }

    /// <summary>
    /// Fail a test run (change status to Failed)
    /// </summary>
    public async Task<bool> FailTestRunAsync(int messID)
    {
        return await UpdateTestRunStatusAsync(messID, "Failed", DateTime.UtcNow);
    }

    /// <summary>
    /// Cancel a test run (change status to Cancelled)
    /// </summary>
    public async Task<bool> CancelTestRunAsync(int messID)
    {
        return await UpdateTestRunStatusAsync(messID, "Cancelled", DateTime.UtcNow);
    }
}
