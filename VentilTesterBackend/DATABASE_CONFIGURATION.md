# Database Configuration Guide

## Overview
The VentilTester Backend now supports both SQLite and PostgreSQL databases. You can switch between them by changing the configuration in `appsettings.json`.

## Current Configuration
**Active Database:** PostgreSQL

## How to Switch Database Providers

### Option 1: Use PostgreSQL (Current)
Edit `appsettings.json`:
```json
{
  "Database": {
    "Provider": "PostgreSQL"
  },
  "ConnectionStrings": {
    "PostgreSQL": "Host=localhost;Port=5432;;Username=admin;Password=admin123"
  }
}
```

### Option 2: Use SQLite
Edit `appsettings.json`:
```json
{
  "Database": {
    "Provider": "SQLite"
  },
  "ConnectionStrings": {
    "Sqlite": "Data Source=ventiltester.db"
  }
}
```

## Connection String Parameters

### PostgreSQL Connection String Format
```
Host=<hostname>;Port=<port>;Database=<database_name>;Username=<username>;Password=<password>
```

**Example with your credentials:**
- Host: `localhost`
- Port: `5432`
- Database: `ventiltester`
- Username: `admin`
- Password: `admin123`

### SQLite Connection String Format
```
Data Source=<path_to_database_file>
```

## Database Setup

### PostgreSQL Setup
1. Ensure PostgreSQL is running on localhost:5432
2. Create the database (if not exists):
   ```sql
   CREATE DATABASE ventiltester;
   ```
3. The application will automatically create tables on first run

### SQLite Setup
- No setup required
- Database file is created automatically on first run

## Switching Databases at Runtime
1. Stop the application
2. Edit `appsettings.json` and change the `Database:Provider` value
3. Restart the application
4. The application will detect the change and use the configured database

## Notes
- Both database providers are included in the project dependencies
- The schema is created automatically using Entity Framework migrations
- Existing data will remain in each database when switching providers
- To migrate data between databases, you'll need to export/import manually
