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
    public DbSet<TestRun> TestRuns { get; set; } = null!;
    public DbSet<TestRunVentilConfig> TestRunVentilConfigs { get; set; } = null!;

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Configure ParameterSet with unique index on Name
        modelBuilder.Entity<ParameterSet>()
            .HasIndex(p => p.Name)
            .IsUnique();

        // Configure TestRun relationships
        modelBuilder.Entity<TestRun>()
            .HasOne(tr => tr.VentilkonfigurationParameterSet)
            .WithMany()
            .HasForeignKey(tr => tr.VentilkonfigurationId)
            .OnDelete(DeleteBehavior.SetNull);

        modelBuilder.Entity<TestRun>()
            .HasOne(tr => tr.KonfigurationLangzeittestParameterSet)
            .WithMany()
            .HasForeignKey(tr => tr.KonfigurationLangzeittestId)
            .OnDelete(DeleteBehavior.SetNull);

        modelBuilder.Entity<TestRun>()
            .HasOne(tr => tr.KonfigurationDetailtestParameterSet)
            .WithMany()
            .HasForeignKey(tr => tr.KonfigurationDetailtestId)
            .OnDelete(DeleteBehavior.SetNull);

        // Configure MeasurementSet relationship to TestRun
        modelBuilder.Entity<MeasurementSet>()
            .HasOne(ms => ms.TestRun)
            .WithMany()
            .HasForeignKey(ms => ms.MessID)
            .OnDelete(DeleteBehavior.SetNull);

        // Configure TestRunVentilConfig relationship to TestRun
        modelBuilder.Entity<TestRunVentilConfig>()
            .HasOne(vc => vc.TestRun)
            .WithMany(tr => tr.VentilConfigs)
            .HasForeignKey(vc => vc.TestRunMessID)
            .OnDelete(DeleteBehavior.Cascade); // Delete ventil configs when test run is deleted

        // Create unique index on TestRunMessID + VentilNumber to prevent duplicates
        modelBuilder.Entity<TestRunVentilConfig>()
            .HasIndex(vc => new { vc.TestRunMessID, vc.VentilNumber })
            .IsUnique();
    }
}
