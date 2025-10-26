using Microsoft.EntityFrameworkCore;
using Microsoft.OpenApi.Models;

var builder = WebApplication.CreateBuilder(args);

// Bind to port 8000 on all interfaces so containerized Grafana can reach the backend via host.docker.internal
builder.WebHost.UseUrls("http://0.0.0.0:8000");

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c => c.SwaggerDoc("v1", new OpenApiInfo { Title = "OPC UA C# Backend", Version = "v1" }));

builder.Services.AddDbContext<AppDbContext>(options => options.UseSqlite("Data Source=../database_csharp.db"));
builder.Services.AddSingleton<OpcUaService>();
builder.Services.AddHostedService<BackgroundStoreService>();
builder.Services.AddCors(options => options.AddPolicy("AllowAll", p => p.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod()));

var app = builder.Build();
app.UseCors("AllowAll");

if (app.Environment.IsDevelopment())
{
	app.UseSwagger();
	app.UseSwaggerUI();
}

using var scope = app.Services.CreateScope();
var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
db.Database.EnsureCreated();

ApiEndpoints.MapEndpoints(app);

app.Run();
