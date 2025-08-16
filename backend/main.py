from fastapi import FastAPI, HTTPException, Depends, Query
from fastapi import FastAPI, HTTPException, Depends, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.orm import Session
from backend.models import Base, engine, get_db, Device
from backend.opcua_client import read_opcua_value, write_opcua_value
from opcua import Client
import uvicorn
import threading
import time

app = FastAPI()

# Get historical values filtered by device and time range
@app.get("/historical_values")
def get_historical_values(
    device_name: str = Query(...),
    start: str = Query(None),
    end: str = Query(None),
    db: Session = Depends(get_db)
):
    from backend.models import Device, HistoricalValue
    device = db.query(Device).filter_by(name=device_name).first()
    if not device:
        return []
    query = db.query(HistoricalValue).filter(HistoricalValue.device_id == device.id)
    if start:
        query = query.filter(HistoricalValue.timestamp >= start)
    if end:
        query = query.filter(HistoricalValue.timestamp <= end)
    results = query.order_by(HistoricalValue.timestamp).all()
    return [
        {
            "type": v.type,
            "index": v.index,
            "node_id": v.node_id,
            "value": v.value,
            "timestamp": v.timestamp
        }
        for v in results
    ]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

Base.metadata.create_all(bind=engine)

class OPCUADataIn(BaseModel):
    node_id: str
    value: float

@app.get("/data")
def get_data(db: Session = Depends(get_db)):
    # Return all device names
    return [d.name for d in db.query(Device).all()]

@app.post("/read_opcua")
def read_opcua(data: OPCUADataIn):
    value = read_opcua_value(data.node_id)
    return {"node_id": data.node_id, "value": value}

@app.post("/write_opcua")
def write_opcua(data: OPCUADataIn):
    success = write_opcua_value(data.node_id, data.value)
    if not success:
        raise HTTPException(status_code=400, detail="Write failed")
    return {"status": "ok"}

@app.post("/save_data")
def save_data(data: OPCUADataIn, db: Session = Depends(get_db)):
    from backend.models import Device, CurrentValue, HistoricalValue
    import datetime
    # Extract device name from node_id
    import re
    match = re.match(r"ns=2;s=(Device\d+)\.(SimValue|ParamValue)(\d+)", data.node_id)
    if not match:
        raise HTTPException(status_code=400, detail="Invalid node_id format")
    device_name, value_type, index = match.groups()
    value_type = "sim" if value_type == "SimValue" else "param"
    index = int(index)
    device = db.query(Device).filter_by(name=device_name).first()
    if not device:
        device = Device(name=device_name)
        db.add(device)
        db.commit()
        db.refresh(device)
    curr = db.query(CurrentValue).filter_by(device_id=device.id, type=value_type, index=index).first()
    if curr:
        curr.value = data.value
        curr.node_id = data.node_id
    else:
        curr = CurrentValue(device_id=device.id, type=value_type, index=index, node_id=data.node_id, value=data.value)
        db.add(curr)
    db.add(HistoricalValue(device_id=device.id, type=value_type, index=index, node_id=data.node_id, value=data.value, timestamp=datetime.datetime.utcnow().isoformat()))
    db.commit()
    db.refresh(curr)
    return {"device": device_name, "type": value_type, "index": index, "value": data.value}

# OPC UA Simulationsserver-Client
OPCUA_SERVER_URL = "opc.tcp://localhost:4840"
sim_client = Client(OPCUA_SERVER_URL)
sim_client.connect()
NUM_DEVICES = 10
NUM_VALUES = 10

@app.get("/sim_values")
def get_sim_values():
    values = []
    for d in range(NUM_DEVICES):
        for i in range(NUM_VALUES):
            sim_node_id = f"ns=2;s=Device{d+1}.SimValue{i+1}"
            try:
                node = sim_client.get_node(sim_node_id)
                value = node.get_value()
            except Exception as e:
                value = None
            values.append({"device": d+1, "type": "sim", "index": i+1, "node_id": sim_node_id, "value": value})
    return values

@app.get("/param_values")
def get_param_values():
    values = []
    for d in range(NUM_DEVICES):
        for i in range(NUM_VALUES):
            param_node_id = f"ns=2;s=Device{d+1}.ParamValue{i+1}"
            try:
                node = sim_client.get_node(param_node_id)
                value = node.get_value()
            except Exception as e:
                value = None
            values.append({"device": d+1, "type": "param", "index": i+1, "node_id": param_node_id, "value": value})
    return values

class ParamValueIn(BaseModel):
    device: int
    index: int
    value: float

@app.post("/param_values")
def set_param_value(data: ParamValueIn):
    param_node_id = f"ns=2;s=Device{data.device}.ParamValue{data.index}"
    node = sim_client.get_node(param_node_id)
    try:
        node.set_value(data.value)
        return {"status": "ok"}
    except Exception:
        raise HTTPException(status_code=400, detail=f"Write failed for {param_node_id}")
# Background thread to periodically read all values and store in DB
def background_store_values():
    from backend.models import SessionLocal, Device, CurrentValue, HistoricalValue
    import datetime
    while True:
        db = SessionLocal()
        for d in range(NUM_DEVICES):
            device_name = f"Device{d+1}"
            device = db.query(Device).filter_by(name=device_name).first()
            if not device:
                device = Device(name=device_name)
                db.add(device)
                db.commit()
                db.refresh(device)
            for i in range(NUM_VALUES):
                # SimValue
                sim_node_id = f"ns=2;s={device_name}.SimValue{i+1}"
                sim_node = sim_client.get_node(sim_node_id)
                sim_value = sim_node.get_value()
                # Update current value
                curr_sim = db.query(CurrentValue).filter_by(device_id=device.id, type="sim", index=i+1).first()
                if curr_sim:
                    curr_sim.value = sim_value
                    curr_sim.node_id = sim_node_id
                else:
                    curr_sim = CurrentValue(device_id=device.id, type="sim", index=i+1, node_id=sim_node_id, value=sim_value)
                    db.add(curr_sim)
                # Add historical value
                db.add(HistoricalValue(device_id=device.id, type="sim", index=i+1, node_id=sim_node_id, value=sim_value, timestamp=datetime.datetime.utcnow().isoformat()))
                # ParamValue
                param_node_id = f"ns=2;s={device_name}.ParamValue{i+1}"
                param_node = sim_client.get_node(param_node_id)
                param_value = param_node.get_value()
                curr_param = db.query(CurrentValue).filter_by(device_id=device.id, type="param", index=i+1).first()
                if curr_param:
                    curr_param.value = param_value
                    curr_param.node_id = param_node_id
                else:
                    curr_param = CurrentValue(device_id=device.id, type="param", index=i+1, node_id=param_node_id, value=param_value)
                    db.add(curr_param)
                db.add(HistoricalValue(device_id=device.id, type="param", index=i+1, node_id=param_node_id, value=param_value, timestamp=datetime.datetime.utcnow().isoformat()))
        db.commit()
        db.close()
        time.sleep(5)

threading.Thread(target=background_store_values, daemon=True).start()

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
