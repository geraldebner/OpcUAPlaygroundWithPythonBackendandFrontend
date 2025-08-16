#  SQLAlchemy

This guide explains SQLAlchemy, the ORM used in the backend of the OPC UA Playground project. It covers setup, model definition, session management, and best practices for database integration.

---

## 1. SQLAlchemy Overview

SQLAlchemy is a powerful Python ORM (Object Relational Mapper) that allows you to interact with databases using Python classes and objects instead of raw SQL queries.

### Key Features
- ORM mapping: Python classes <-> database tables
- Session management
- Database migrations
- Works with many databases (SQLite, PostgreSQL, MySQL, etc.)

---

## 2. Project Setup

### Install Dependencies
```bash
pip install sqlalchemy
```

### File Structure
```
backend/
  models.py       # SQLAlchemy models
```

---

## 3. Defining Database Models

In `models.py`:
```python
from sqlalchemy import Column, Integer, String, Float, ForeignKey, create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship

DATABASE_URL = "sqlite:///database.db"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

class Device(Base):
    __tablename__ = "devices"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    current_values = relationship("CurrentValue", back_populates="device")
    historical_values = relationship("HistoricalValue", back_populates="device")

# ... other models ...
```

---

## 4. Session Management

Sessions are used to interact with the database. Always close sessions after use.

```python
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

---

## 5. Querying and Filtering

```python
@app.get("/historical_values")
def get_historical_values(device_name: str, db: Session = Depends(get_db)):
    device = db.query(Device).filter_by(name=device_name).first()
    if not device:
        return []
    return db.query(HistoricalValue).filter(HistoricalValue.device_id == device.id).all()
```

---

## 6. Best Practices
- Always close database sessions (use `get_db` generator)
- Use migrations for schema changes (e.g., Alembic)
- Keep business logic separate from models

---

## 7. Further Reading
- [SQLAlchemy Documentation](https://docs.sqlalchemy.org/)
