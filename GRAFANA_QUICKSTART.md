# Quick Start: Grafana Setup

## Step 1: Ensure Prerequisites

1. **Docker Desktop** must be running
2. **PostgreSQL** must be running on localhost:5432
3. **VentilTester Backend** must be configured to use PostgreSQL (see DATABASE_CONFIGURATION.md)

## Step 2: Start Grafana

Open PowerShell in the project root and run:

```powershell
docker-compose up -d
```

Or use the management script:

```powershell
.\manage-grafana.ps1
```

## Step 3: Access Grafana

1. Open browser: **http://localhost:3001**
2. Login:
   - Username: `admin`
   - Password: `admin123`

## Step 4: View Dashboard

- Navigate to **Dashboards** → **VentilTester - Measurement Analysis**
- The dashboard is pre-configured and ready to use!

## What You'll See

### 📊 Overview
- Total number of datasets
- Dataset creation timeline

### 📋 Data Table
- Recent 100 datasets with all metadata

### 📈 Visualization Charts
1. **Pressure Measurement Curves** - Plots pMesskurven arrays from your measurements
2. **DatenReady Over Time** - Track measurement readiness signals
3. **MessID Over Time** - Monitor measurement IDs

## Configuration

All configuration files are in the `grafana/` directory:
- `provisioning/datasources/` - PostgreSQL connection
- `provisioning/dashboards/` - Dashboard auto-load settings
- `dashboards/` - Dashboard JSON definitions

## Troubleshooting

### "Cannot connect to database"
Make sure PostgreSQL is accessible from Docker:
```powershell
# Test connection
docker run --rm postgres:latest psql -h host.docker.internal -p 5432 -U admin -d ventiltester -c "SELECT 1"
```

### "No data" in charts
1. Check time range (top-right corner)
2. Verify data exists in database:
```sql
SELECT COUNT(*) FROM "MeasurementSets";
```

## Management Commands

```powershell
# Start Grafana
docker-compose up -d

# Stop Grafana
docker-compose stop

# View logs
docker-compose logs -f grafana

# Restart Grafana
docker-compose restart

# Remove everything (including data)
docker-compose down -v
```

## Next Steps

1. ✅ Start collecting measurement data with VentilTester backend
2. ✅ Watch real-time updates in Grafana (auto-refresh every 10s)
3. ✅ Customize dashboards to your needs
4. ✅ Set up alerts for abnormal measurements

---

For detailed information, see **GRAFANA_SETUP.md**
