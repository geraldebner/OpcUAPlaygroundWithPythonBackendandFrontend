using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using VentilTesterBackend.Data;
using VentilTesterBackend.Services;

namespace VentilTesterBackend.Controllers;

[ApiController]
[Route("api/[controller]")]
public class StatusController : ControllerBase
{
    private readonly OpcUaService _opc;
    private readonly NodeMapping _mapping;
    private readonly AppDbContext _db;
    private readonly IConfiguration _config;
    private readonly ILogger<StatusController> _logger;

    public StatusController(
        AppDbContext db,
        OpcUaService opc,
        NodeMapping mapping,
        IConfiguration config,
        ILogger<StatusController> logger
    )
    {
        _db = db;
        _opc = opc;
        _mapping = mapping;
        _config = config;
        _logger = logger;
        _logger.LogDebug("StatusController constructed");
    }

    [HttpGet]
    public ActionResult<object> Get()
    {
        // Provide a quick health/status summary
        _logger.LogInformation("Status check requested");
        bool dbOk = false;
        try
        {
            dbOk = _db.Database.CanConnect();
            _logger.LogDebug("Database CanConnect -> {dbOk}", dbOk);
        }
        catch (Exception ex)
        {
            dbOk = false;
            _logger.LogWarning(ex, "Database connectivity check failed");
        }

        var healthNode = _config.GetValue<string>("OpcUa:HealthNodeId");
        bool opcAlive = false;
        try
        {
            _logger.LogDebug("Pinging OPC UA health node {node}", healthNode);
            opcAlive = _opc?.Ping(healthNode) ?? false;
            _logger.LogDebug("OPC UA ping result -> {opcAlive}", opcAlive);
        }
        catch (Exception ex)
        {
            opcAlive = false;
            _logger.LogWarning(ex, "OPC UA ping failed");
        }

        var opc = new
        {
            connected = opcAlive,
            endpoint = _opc?.Endpoint ?? string.Empty,
            configuredHealthNode = healthNode,
            lastSuccessfulCheck = _opc?.LastSuccessfulCheck,
            lastError = _opc?.LastError,
        };

        // Read DB_GlobalData1 parameters if OPC UA is connected
        Dictionary<string, object?>? globalData = null;
        if (opcAlive)
        {
            try
            {
                _logger.LogDebug("Reading DB_GlobalData1 parameters");
                globalData = new Dictionary<string, object?>();
                
                // Try to read common DB_GlobalData1 parameters
                var globalDataParams = new[] { "Version", "TemperaturePLC", "BatteryStatus", "GeneralErrors" };
                foreach (var paramName in globalDataParams)
                {
                    try
                    {
                        var param = _opc.ReadParameter(0, "DB_GlobalData1", paramName); // blockIndex 0 for global data
                        if (param != null)
                        {
                            globalData[paramName] = param.Value;
                        }
                    }
                    catch (Exception ex)
                    {
                        _logger.LogWarning(ex, "Failed to read DB_GlobalData1.{ParamName}", paramName);
                        globalData[paramName] = null;
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to read DB_GlobalData1");
            }
        }

        _logger.LogInformation("Status check returning: opc.connected={opcConnected}, db.connected={dbConnected}", opcAlive, dbOk);

        return new
        {
            backend = "ok",
            opcua = opc,
            database = new { connected = dbOk },
            globalData = globalData
        };
    }

    [HttpGet("sample/{blockIndex}")]
    public ActionResult<object> Sample(int blockIndex = 1)
    {
        try
        {
            _logger.LogInformation("Sample request for block {blockIndex}", blockIndex);
            // Return the backend's current view of the requested block (what the UI will see)
            //var block = _opc.ReadBlock(blockIndex);
            return Ok(
                new
                {
                    connected = true, /*, block*/
                }
            );
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Sample request failed for block {blockIndex}", blockIndex);
            return StatusCode(500, new { error = ex.Message });
        }
    }
}
