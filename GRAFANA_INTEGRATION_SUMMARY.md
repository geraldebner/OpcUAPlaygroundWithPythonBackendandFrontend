# Grafana + PostgreSQL Integration Summary

## What Was Set Up

### 1. Docker Compose Configuration
- **File**: `docker-compose.yml`
- **Service**: Grafana latest version
- **Port**: 3001 (http://localhost:3001)
- **Credentials**: admin / admin123

### 2. PostgreSQL Data Source
- **File**: `grafana/provisioning/datasources/postgresql.yml`
- **Connection**: host.docker.internal:5432
- **Database**: ventiltester
- **User**: admin
- **Auto-configured**: Connects automatically on startup

### 3. Pre-built Dashboard
- **File**: `grafana/dashboards/measurement-analysis.json`
- **Name**: VentilTester - Measurement Analysis
- **Auto-loaded**: Available immediately after Grafana starts

## Dashboard Features

### Panels Included:

1. **Total Datasets** (Stat)
   - Shows count of all measurement sets

2. **Datasets Created Over Time** (Time Series Bar)
   - Hourly aggregation of dataset creation

3. **Recent Measurement Datasets** (Table)
   - Last 100 datasets with full metadata
   - Columns: Id, Name, BlockIndex, IdentifierNumber, Comment, CreatedAt

4. **Pressure Measurement Curves** (Time Series Line)
   - Extracts and plots pMesskurven arrays from JSON
   - Supports multiple datasets overlay
   - Variable: $dataset_limit (1, 5, 10, 20, 50)
   - Statistics: Mean, Min, Max in legend

5. **DatenReady Values Over Time** (Time Series)
   - Tracks DatenReady parameter changes

6. **MessID Values Over Time** (Time Series)
   - Tracks MessID values across measurements

## Key PostgreSQL Queries

### JSON Extraction Examples:

```sql
-- Extract pMesskurven array
jsonb_path_query("JsonPayload"::jsonb, '$.groups.*.pMesskurven.value')

-- Extract single value
jsonb_path_query_first("JsonPayload"::jsonb, '$.groups.*.DatenReady.value') #>> '{}'

-- Expand array to rows
jsonb_array_elements_text(curve_data::text::jsonb)
```

## Files Created

```
├── docker-compose.yml                          # Docker services definition
├── .dockerignore                               # Docker build exclusions
├── manage-grafana.ps1                          # PowerShell management script
├── GRAFANA_QUICKSTART.md                       # Quick start guide
├── GRAFANA_SETUP.md                            # Detailed setup guide
└── grafana/
    ├── provisioning/
    │   ├── datasources/
    │   │   └── postgresql.yml                  # PostgreSQL connection config
    │   └── dashboards/
    │       └── dashboards.yml                  # Dashboard provider config
    └── dashboards/
        └── measurement-analysis.json           # Pre-built dashboard
```

## Usage

### Start Grafana:
```powershell
docker-compose up -d
```

### Access:
- URL: http://localhost:3001
- Username: admin
- Password: admin123

### Management:
```powershell
.\manage-grafana.ps1
```

## Integration with VentilTester Backend

The dashboard automatically reads from the `MeasurementSets` table:

```sql
CREATE TABLE "MeasurementSets" (
    "Id" INTEGER PRIMARY KEY,
    "Name" TEXT,
    "BlockIndex" INTEGER,
    "IdentifierNumber" INTEGER,
    "Comment" TEXT,
    "JsonPayload" TEXT,
    "CreatedAt" TIMESTAMP
);
```

### JSON Payload Structure Expected:
```json
{
  "groups": {
    "GroupName": [
      {
        "name": "pMesskurven",
        "value": "[array of integers]",
        "dataType": "Int16[]"
      },
      {
        "name": "DatenReady",
        "value": "integer",
        "dataType": "Int32"
      },
      {
        "name": "MessID",
        "value": "integer",
        "dataType": "Int32"
      }
    ]
  }
}
```

## Advanced Customization

### Add New Panels:
1. Edit dashboard in Grafana UI
2. Export as JSON
3. Save to `grafana/dashboards/`

### Modify Queries:
- All panels use PostgreSQL's JSON functions
- Edit queries directly in Grafana's query editor
- Use Grafana variables for dynamic filtering

### Create Alerts:
1. Edit panel
2. Add alert rule
3. Configure notification channels

## Troubleshooting

### Connection Issues:
- Ensure PostgreSQL allows connections from Docker
- Verify `host.docker.internal` resolves correctly
- Check firewall settings

### No Data Visible:
- Adjust time range (default: Last 24 hours)
- Verify data exists: `SELECT COUNT(*) FROM "MeasurementSets";`
- Check JSON structure matches expected format

### Dashboard Not Loading:
- Check Grafana logs: `docker-compose logs grafana`
- Verify provisioning files are valid YAML/JSON
- Restart Grafana: `docker-compose restart`

## Performance Tips

1. **Limit Dataset Count**: Use $dataset_limit variable to control query load
2. **Time Range**: Narrow time ranges for faster queries
3. **Indexes**: Add database indexes on CreatedAt and Id columns
4. **Caching**: Grafana caches query results automatically

## Next Steps

1. ✅ Start VentilTester backend with PostgreSQL
2. ✅ Generate measurement data (auto-save or manual)
3. ✅ Open Grafana and view real-time dashboards
4. ✅ Customize panels for your specific analysis needs
5. ✅ Set up alerts for critical measurements

---

**Documentation References:**
- Quick Start: GRAFANA_QUICKSTART.md
- Detailed Setup: GRAFANA_SETUP.md
- Database Config: DATABASE_CONFIGURATION.md
