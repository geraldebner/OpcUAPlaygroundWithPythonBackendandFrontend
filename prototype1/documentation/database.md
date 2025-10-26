# Database – SQLite & SQLAlchemy

## Technologies
- **SQLite**: Lightweight, file-based database.
- **SQLAlchemy**: Python ORM for database access.

## Schema
- **Device**: Stores device names.
- **CurrentValue**: Stores latest value for each device/value type.
- **HistoricalValue**: Stores all value changes with timestamps.

## Example Table Definitions
```python
class Device(Base):
    __tablename__ = "devices"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)

class CurrentValue(Base):
    __tablename__ = "current_values"
    id = Column(Integer, primary_key=True, index=True)
    device_id = Column(Integer, ForeignKey("devices.id"))
    type = Column(String, index=True)  # 'sim' or 'param'
    index = Column(Integer)
    node_id = Column(String, index=True)
    value = Column(Float)

class HistoricalValue(Base):
    __tablename__ = "historical_values"
    id = Column(Integer, primary_key=True, index=True)
    device_id = Column(Integer, ForeignKey("devices.id"))
    type = Column(String, index=True)  # 'sim' or 'param'
    index = Column(Integer)
    node_id = Column(String, index=True)
    value = Column(Float)
    timestamp = Column(String, index=True)
```

## Data Flow
- Backend reads values from OPC UA and stores them in the database.
- Frontend fetches current and historical values via API.

See `backend.md` for how data is stored and `frontend.md` for how it is displayed.
