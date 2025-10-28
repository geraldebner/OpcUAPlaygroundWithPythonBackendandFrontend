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

// Request logging middleware: logs incoming HTTP requests and responses (method, path, status, duration)
app.Use(async (context, next) =>
{
    var logger = context.RequestServices.GetService<ILoggerFactory>()?.CreateLogger("HttpRequestLogger");
    var sw = System.Diagnostics.Stopwatch.StartNew();
    try
    {
        logger?.LogInformation("Incoming HTTP {Method} {Path}{QueryString}", context.Request.Method, context.Request.Path, context.Request.QueryString);
        await next();
        sw.Stop();
        logger?.LogInformation("HTTP {Method} {Path} responded {StatusCode} in {Elapsed}ms", context.Request.Method, context.Request.Path, context.Response.StatusCode, sw.ElapsedMilliseconds);
    }
    catch (Exception ex)
    {
        sw.Stop();
        logger?.LogError(ex, "HTTP {Method} {Path} threw after {Elapsed}ms", context.Request.Method, context.Request.Path, sw.ElapsedMilliseconds);
        throw;
    }
});

app.UseRouting();
app.UseAuthorization();

app.MapControllers();

// Log all registered endpoints (helpful for debugging routing issues)
try
{
    var logger = app.Services.GetService<ILoggerFactory>()?.CreateLogger("EndpointLogger");
    var endpoints = app.Services.GetService<Microsoft.AspNetCore.Routing.EndpointDataSource>()?.Endpoints;
    if (endpoints != null)
    {
        foreach (var ep in endpoints)
        {
            if (ep is Microsoft.AspNetCore.Routing.RouteEndpoint re)
            {
                logger?.LogInformation("Endpoint: {Pattern} => {DisplayName}", re.RoutePattern.RawText, re.DisplayName);
            }
            else
            {
                logger?.LogInformation("Endpoint: {Endpoint}", ep.DisplayName ?? ep.ToString());
            }
        }
    }
}
catch { }

app.Run();
