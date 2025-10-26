using Microsoft.EntityFrameworkCore;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }
    public DbSet<Device> Devices => Set<Device>();
    public DbSet<CurrentValue> CurrentValues => Set<CurrentValue>();
    public DbSet<HistoricalValue> HistoricalValues => Set<HistoricalValue>();
}

public class Device { public int Id { get; set; } public string Name { get; set; } = null!; }
public class CurrentValue { public int Id { get; set; } public int DeviceId { get; set; } public string Type { get; set; } = null!; public int Index { get; set; } public string NodeId { get; set; } = null!; public double Value { get; set; } }
public class HistoricalValue { public int Id { get; set; } public int DeviceId { get; set; } public string Type { get; set; } = null!; public int Index { get; set; } public string NodeId { get; set; } = null!; public double Value { get; set; } public string Timestamp { get; set; } = null!; }

public record OPCUADataIn(string NodeId, double Value);
public record ParamValueIn(int Device, int Index, double Value);
