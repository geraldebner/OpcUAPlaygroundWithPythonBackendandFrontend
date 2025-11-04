using Microsoft.AspNetCore.Mvc;
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

    public StatusController(
        AppDbContext db,
        OpcUaService opc,
        NodeMapping mapping,
        IConfiguration config
    )
    {
        _db = db;
        _opc = opc;
        _mapping = mapping;
        _config = config;
    }

    [HttpGet]
    public ActionResult<object> Get()
    {
        // Provide a quick health/status summary
        bool dbOk = false;
        try
        {
            dbOk = _db.Database.CanConnect();
        }
        catch
        {
            dbOk = false;
        }

        var healthNode = _config.GetValue<string>("OpcUa:HealthNodeId");
        bool opcAlive = false;
        try
        {
            opcAlive = _opc?.Ping(healthNode) ?? false;
        }
        catch
        {
            opcAlive = false;
        }

        var opc = new
        {
            connected = opcAlive,
            endpoint = _opc?.Endpoint ?? string.Empty,
            configuredHealthNode = healthNode,
            lastSuccessfulCheck = _opc?.LastSuccessfulCheck,
            lastError = _opc?.LastError,
        };

        return new
        {
            backend = "ok",
            opcua = opc,
            database = new { connected = dbOk },
        };
    }

    [HttpGet("sample/{blockIndex}")]
    public ActionResult<object> Sample(int blockIndex = 1)
    {
        try
        {
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
            return StatusCode(500, new { error = ex.Message });
        }
    }
}
