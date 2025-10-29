using Microsoft.AspNetCore.Mvc;

namespace VentilTesterBackend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class DatasetsController : ControllerBase
    {
        // This controller is intentionally minimal to avoid duplicate/ corrupted logic.
        // Use /api/measurementsets for dataset management (MeasurementSetsController).

        [HttpGet]
        public IActionResult Get() => NotFound(new { error = "Use /api/measurementsets instead" });
    }
}
