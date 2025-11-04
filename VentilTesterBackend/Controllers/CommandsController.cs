using Microsoft.AspNetCore.Mvc;
using VentilTesterBackend.Services;

namespace VentilTesterBackend.Controllers;

[ApiController]
[Route("api/commands")]
public class CommandsController : ControllerBase
{
    private readonly OpcUaService _opc;
    private readonly ILogger<CommandsController> _log;

    public CommandsController(OpcUaService opc, ILogger<CommandsController> log)
    {
        _opc = opc;
        _log = log;
    }

    /// <summary>
    /// Trigger a command for a block.
    /// POST /api/commands/{index}/{testType}/{action}
    /// Optional JSON body { "value": "..." } to provide a payload (e.g. Ventilnummer for Einzeltest).
    /// </summary>
    // Internal executor used by both GET and POST endpoints
    private ActionResult DoExecute(int index, string testType, string action, string? payload)
    {
        if (index < 1 || index > 4)
            return BadRequest("block index must be 1..4");

        _log?.LogInformation(
            "CommandsController.DoExecute called: index={Index} testType={TestType} action={Action} payload={Payload}",
            index,
            testType,
            action,
            payload
        );

        var ok = _opc.ExecuteCommand(index, testType, action, payload);
        if (!ok)
            return StatusCode(500, "Command failed or server unreachable");
        return Ok();
    }

    // POST endpoint: accepts optional JSON body { "value": "..." }
    // index, testType and action are provided as query parameters for POST requests
    // Example: POST /api/commands?index=1&testType=Langzeittest&action=Start  with optional body { "value": "5" }
    [HttpPost]
    public ActionResult ExecutePost(
        [FromQuery] int index,
        [FromQuery] string testType,
        [FromQuery] string action,
        [FromQuery] string? value
    )
    {
        if (string.IsNullOrEmpty(testType) || string.IsNullOrEmpty(action))
            return BadRequest("testType and action query parameters are required");
        // optional payload passed as query param 'value' (e.g. Einzeltest ventil number)
        var payload = string.IsNullOrEmpty(value) ? null : value;
        return DoExecute(index, testType, action, payload);
    }

    // GET endpoint: convenience wrapper for older clients that issue GETs
    [HttpGet("{index}/{testType}/{action}")]
    public ActionResult ExecuteGet(int index, string testType, string action)
    {
        return DoExecute(index, testType, action, null);
    }

    // Simple ping to verify controller is reachable
    [HttpGet("ping")]
    public ActionResult Ping()
    {
        _log?.LogInformation("CommandsController.Ping");
        return Ok("pong");
    }
}
