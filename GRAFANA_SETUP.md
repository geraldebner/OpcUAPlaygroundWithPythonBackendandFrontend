# Grafana Setup Guide for VentilTester

This guide will help you set up Grafana to analyze measurement data from the PostgreSQL database.

## Prerequisites

- Docker Desktop installed and running
- PostgreSQL database running on localhost:5432
- VentilTester backend configured to use PostgreSQL

## Quick Start

### 1. Start Grafana

Open PowerShell in the project root directory and run:

```powershell
docker-compose up -d
```

This will start Grafana on **http://localhost:3001**

### 2. Access Grafana

1. Open your browser and navigate to: **http://localhost:3001**
2. Login with:
   - Username: `admin`
   - Password: `admin123`

### 3. View the Dashboard

The dashboard is automatically provisioned and should be available immediately:
- Navigate to **Dashboards** → **VentilTester - Measurement Analysis**

## Dashboard Features

### Overview Section
- **Total Datasets**: Shows the total number of measurement datasets in the database
- **Datasets Created Over Time**: Bar chart showing dataset creation frequency

### Data Table
- **Recent Measurement Datasets**: Lists the last 100 datasets with:
  - ID, Name, Block Index
  - Identifier Number (MessID)
  - Comment
  - Creation timestamp

### Visualization Panels

#### 1. Pressure Measurement Curves (pMesskurven)
- Extracts and plots pressure arrays from JSON payloads
- Shows multiple datasets overlaid for comparison
- Legend displays: Mean, Min, Max values
- Variable: `$dataset_limit` controls how many recent datasets to plot (1, 5, 10, 20, or 50)

#### 2. DatenReady Values Over Time
- Tracks DatenReady parameter changes across datasets
- Useful for monitoring data collection triggers

#### 3. MessID Values Over Time
- Tracks MessID values across datasets
- Helps identify measurement sequences

## Dashboard Variables

### $dataset_limit
Located at the top of the dashboard, this variable controls how many recent datasets are plotted in the pressure curve chart.

**Options**: 1, 5, 10, 20, 50 datasets

**Default**: 10

## Time Range Selection

Use the time picker in the top-right corner to:
- Select predefined ranges (Last 5 minutes, Last 24 hours, etc.)
- Set custom time ranges
- Default: Last 24 hours

## Auto-Refresh

The dashboard auto-refreshes every 10 seconds to show the latest data. You can change this in the top-right corner.

## Advanced: Customizing the Dashboard

### Editing Panels
1. Click the panel title
2. Select **Edit**
3. Modify the SQL query or visualization settings
4. Click **Apply** to save

### Creating New Panels
1. Click **Add panel** button (top-right)
2. Configure your visualization
3. Write PostgreSQL queries to extract data
4. Save the dashboard

## PostgreSQL Query Examples

### Extract Array Data from JSON
```sql
-- Extract pMesskurven arrays
SELECT 
  jsonb_path_query(
    "JsonPayload"::jsonb, 
    '$.groups.*.pMesskurven.value'
  ) as curve_data
FROM "MeasurementSets"
WHERE "JsonPayload"::jsonb @? '$.groups.*.pMesskurven.value'
```

### Extract Single Values
```sql
-- Extract DatenReady value
SELECT 
  (jsonb_path_query_first(
    "JsonPayload"::jsonb, 
    '$.groups.*.DatenReady.value'
  ) #>> '{}')::int as daten_ready
FROM "MeasurementSets"
```

### Expand Arrays to Rows
```sql
-- Expand pressure array into individual rows
WITH dataset_curves AS (
  SELECT 
    "Id",
    "Name",
    jsonb_path_query(
      "JsonPayload"::jsonb, 
      '$.groups.*.pMesskurven.value'
    ) as curve_data
  FROM "MeasurementSets"
)
SELECT 
  "Id",
  "Name",
  jsonb_array_elements_text(curve_data::text::jsonb)::int as pressure_value,
  generate_series(0, jsonb_array_length(curve_data::text::jsonb) - 1) as sample_index
FROM dataset_curves
```

## Database Schema

The main table is **MeasurementSets** with the following structure:

| Column | Type | Description |
|--------|------|-------------|
| Id | int | Primary key |
| Name | text | Dataset name |
| BlockIndex | int | OPC UA block index |
| IdentifierNumber | int | Measurement ID (MessID) |
| Comment | text | Description/notes |
| JsonPayload | text | JSON containing all measurement data |
| CreatedAt | timestamp | Creation time |

### JSON Payload Structure

```json
{
  "groups": {
    "GroupName": [
      {
        "name": "pMesskurven",
        "value": "[-499,-499,...,0,0]",
        "dataType": "Int16[]"
      },
      {
        "name": "DatenReady",
        "value": "7",
        "dataType": "Int32"
      },
      {
        "name": "MessID",
        "value": "10",
        "dataType": "Int32"
      }
    ]
  }
}
```

## Troubleshooting

### Cannot Connect to PostgreSQL
1. Verify PostgreSQL is running: `psql -U admin -d ventiltester -h localhost -p 5432`
2. Check Docker network can access host: Use `host.docker.internal` instead of `localhost`
3. Verify database credentials in `grafana/provisioning/datasources/postgresql.yml`

### Dashboard Not Showing Data
1. Check time range - ensure it covers your data period
2. Verify data exists in database: `SELECT COUNT(*) FROM "MeasurementSets";`
3. Check panel queries for errors (Edit panel → Query inspector)

### Container Not Starting
```powershell
# Check container logs
docker logs ventiltester-grafana

# Restart container
docker-compose restart

# Rebuild and restart
docker-compose down
docker-compose up -d
```

## Stopping Grafana

```powershell
docker-compose down
```

To remove all data and start fresh:
```powershell
docker-compose down -v
```

## Next Steps

1. **Explore Data**: Use the dashboard to visualize your measurement data
2. **Create Alerts**: Set up alerts for anomalies in measurements
3. **Export Data**: Use Grafana's export features to save visualizations
4. **Share Dashboards**: Create user accounts and share dashboards with your team

## Additional Resources

- [Grafana Documentation](https://grafana.com/docs/)
- [PostgreSQL JSON Functions](https://www.postgresql.org/docs/current/functions-json.html)
- [Grafana Dashboard Best Practices](https://grafana.com/docs/grafana/latest/dashboards/build-dashboards/best-practices/)
