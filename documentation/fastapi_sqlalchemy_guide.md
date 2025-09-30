# Step-by-Step Guide: FastAPI & SQLAlchemy

This guide explains how FastAPI and SQLAlchemy work together in the backend of the OPC UA Playground project. It covers setup, usage, and best practices for building REST APIs with database integration.

---

## 1. FastAPI Overview

FastAPI is a modern, fast (high-performance) web framework for building APIs with Python 3.7+ based on standard Python type hints. It automatically generates interactive API docs (Swagger UI) and supports async programming.

### Key Features
- Automatic validation and documentation
- Dependency injection
- Async support
- Easy integration with databases

---

## 2. SQLAlchemy Overview

SQLAlchemy is a powerful Python ORM (Object Relational Mapper) that allows you to interact with databases using Python classes and objects instead of raw SQL queries.

### Key Features
- ORM mapping: Python classes <-> database tables
- Session management
- Database migrations
- Works with many databases (SQLite, PostgreSQL, MySQL, etc.)

---

## 3. Project Setup

### Install Dependencies
```bash
pip install fastapi uvicorn sqlalchemy pydantic
```

### File Structure
```
backend/
  main.py         # FastAPI app
  models.py       # SQLAlchemy models
```

---

## 4. Defining Database Models (SQLAlchemy)

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

## 5. Creating the FastAPI App

In `main.py`:
```python
from fastapi import FastAPI, Depends
from backend.models import Base, engine, get_db, Device
from sqlalchemy.orm import Session

app = FastAPI()
Base.metadata.create_all(bind=engine)  # Create tables
```

---

## 6. Dependency Injection for Database Sessions

FastAPI uses dependency injection to manage database sessions. The `get_db` function yields a session for each request.

```python
@app.get("/devices")
def get_devices(db: Session = Depends(get_db)):
    return db.query(Device).all()
```
- `Depends(get_db)`: FastAPI will call `get_db` and inject the session into the endpoint.

---

## 7. Creating REST Endpoints

Endpoints are Python functions decorated with `@app.get`, `@app.post`, etc. They use SQLAlchemy sessions to query or modify the database.

```python
@app.post("/devices")
def create_device(device: DeviceIn, db: Session = Depends(get_db)):
    new_device = Device(name=device.name)
    db.add(new_device)
    db.commit()
    db.refresh(new_device)
    return new_device
```

---

## 8. Example: Querying and Filtering

```python
@app.get("/historical_values")
def get_historical_values(device_name: str, db: Session = Depends(get_db)):
    device = db.query(Device).filter_by(name=device_name).first()
    if not device:
        return []
    return db.query(HistoricalValue).filter(HistoricalValue.device_id == device.id).all()
```

---

## 9. Best Practices
- Always close database sessions (use `get_db` generator)
- Use Pydantic models for request/response validation
- Handle exceptions and return meaningful error messages
- Use migrations for schema changes (e.g., Alembic)
- Keep business logic separate from API routes

---

## 10. Interactive API Docs

After starting FastAPI, visit [http://localhost:8000/docs](http://localhost:8000/docs) for interactive documentation and testing.

---

## 11. Further Reading
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [SQLAlchemy Documentation](https://docs.sqlalchemy.org/)
- [Pydantic Documentation](https://docs.pydantic.dev/)
