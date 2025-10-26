using Microsoft.EntityFrameworkCore;
using VentilTesterBackend.Data;
using VentilTesterBackend.Services;

var builder = WebApplication.CreateBuilder(args);

// Configuration
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// CORS: allow frontend dev server during development
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowLocalDev", policy =>
    {
        policy.WithOrigins("http://localhost:3000")
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

// DB
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlite(builder.Configuration.GetConnectionString("Sqlite")));

// OPC UA service
builder.Services.AddSingleton<NodeMapping>();
builder.Services.AddSingleton<OpcUaService>();

var app = builder.Build();

// Ensure DB created
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.EnsureCreated();
}

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// enable CORS
app.UseCors("AllowLocalDev");

app.UseRouting();
app.UseAuthorization();

app.MapControllers();

app.Run();
