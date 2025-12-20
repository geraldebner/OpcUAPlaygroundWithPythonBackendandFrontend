using Microsoft.EntityFrameworkCore;
using VentilTesterBackend.Models;

namespace VentilTesterBackend.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options)
        : base(options)
    {
    }

    public DbSet<ParameterSet> ParameterSets { get; set; } = null!;
    public DbSet<MeasurementSet> MeasurementSets { get; set; } = null!;
}
