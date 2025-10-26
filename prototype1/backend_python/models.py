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

class CurrentValue(Base):
    __tablename__ = "current_values"
    id = Column(Integer, primary_key=True, index=True)
    device_id = Column(Integer, ForeignKey("devices.id"))
    type = Column(String, index=True)  # 'sim' or 'param'
    index = Column(Integer)
    node_id = Column(String, index=True)
    value = Column(Float)
    device = relationship("Device", back_populates="current_values")

class HistoricalValue(Base):
    __tablename__ = "historical_values"
    id = Column(Integer, primary_key=True, index=True)
    device_id = Column(Integer, ForeignKey("devices.id"))
    type = Column(String, index=True)  # 'sim' or 'param'
    index = Column(Integer)
    node_id = Column(String, index=True)
    value = Column(Float)
    timestamp = Column(String, index=True)
    device = relationship("Device", back_populates="historical_values")
