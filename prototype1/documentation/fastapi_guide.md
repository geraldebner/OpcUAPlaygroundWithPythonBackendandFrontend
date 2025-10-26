#  FastAPI

This guide explains FastAPI, the web framework used in the backend of the OPC UA Playground project. It covers setup, usage, and best practices for building REST APIs.

---

## 1. FastAPI Overview

FastAPI is a modern, fast (high-performance) web framework for building APIs with Python 3.7+ based on standard Python type hints. It automatically generates interactive API docs (Swagger UI) and supports async programming.

### Key Features
- Automatic validation and documentation
- Dependency injection
- Async support
- Easy integration with databases

---

## 2. Project Setup

### Install Dependencies
```bash
pip install fastapi uvicorn pydantic
```

### File Structure
```
backend/
  main.py         # FastAPI app
```

---

## 3. Creating the FastAPI App

In `main.py`:
```python
from fastapi import FastAPI
app = FastAPI()
```

---

## 4. Creating REST Endpoints

Endpoints are Python functions decorated with `@app.get`, `@app.post`, etc.

```python
@app.get("/hello")
def hello():
    return {"message": "Hello, world!"}
```

---

## 5. Dependency Injection

FastAPI uses dependency injection to manage resources like database sessions.

```python
from fastapi import Depends
@app.get("/devices")
def get_devices(db: Session = Depends(get_db)):
    return db.query(Device).all()
```

---

## 6. Interactive API Docs

After starting FastAPI, visit [http://localhost:8000/docs](http://localhost:8000/docs) for interactive documentation and testing.

---

## 7. Best Practices
- Use Pydantic models for request/response validation
- Handle exceptions and return meaningful error messages
- Keep business logic separate from API routes

---

## 8. Further Reading
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Pydantic Documentation](https://docs.pydantic.dev/)
