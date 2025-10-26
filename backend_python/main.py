
# Utility to build hierarchical OPC UA data tree
def build_opcua_tree():
    # This is a static structure based on your provided hierarchy. In production, you may want to browse nodes dynamically.
    tree = {
        "AllgemeineParameter": [
            {"name": "SkalierungDruckmessungMin", "node_id": "ns=2;s=SkalierungDruckmessungMin"},
            {"name": "SkalierungDruckmessungMax", "node_id": "ns=2;s=SkalierungDruckmessungMax"},
            {"name": "SkalierungDurchflussmessungMin", "node_id": "ns=2;s=SkalierungDurchflussmessungMin"},
            {"name": "SkalierungDurchflussmessungMax", "node_id": "ns=2;s=SkalierungDurchflussmessungMax"},
            {"name": "Fehlerbit", "node_id": "ns=2;s=Fehlerbit"}
        ],
        "Ventilkonfiguration": {
            "VentilanzahlInVerwendung": {"node_id": "ns=2;s=VentilanzahlInVerwendung"},
            "VentilSperre": {"node_id": "ns=2;s=VentilSperre"},
            "PWM": {
                "Anregung": {"node_id": "ns=2;s=PWM.Anregung"},
                "Anregungszeit": {"node_id": "ns=2;s=PWM.Anregungszeit"},
                "Zwischenerregung": {"node_id": "ns=2;s=PWM.Zwischenerregung"},
                "Zwischenerregungszeit": {"node_id": "ns=2;s=PWM.Zwischenerregungszeit"},
                "Halten": {"node_id": "ns=2;s=PWM.Halten"}
            },
            "KonfigÜbernehmen": {"node_id": "ns=2;s=KonfigÜbernehmen"}
        },
        # ... Add other blocks here, following your hierarchy ...
    }
    # For each leaf node, read the value from OPC UA
    def read_node(node):
        if isinstance(node, dict) and "node_id" in node:
            try:
                value = sim_client.get_node(node["node_id"]).get_value()
            except Exception:
                value = None
            return {"name": node.get("name", ""), "node_id": node["node_id"], "value": value}
        elif isinstance(node, list):
            return [read_node(n) for n in node]
        elif isinstance(node, dict):
            return {k: read_node(v) for k, v in node.items()}
        return node
    return read_node(tree)


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

# Place this after app = FastAPI()
@app.get("/opcua_tree")
def get_opcua_tree():
    return build_opcua_tree()

# Status endpoint for OPC UA server and backend
import datetime
start_time = datetime.datetime.utcnow()

@app.get("/status")
def get_status(db: Session = Depends(get_db)):
    # OPC UA server status
    opcua_connected = False
    try:
        # Try to read a known node value
        test_node_id = "ns=2;s=Device1.SimValue1"
        node = sim_client.get_node(test_node_id)
        value = node.get_value()
        opcua_connected = value is not None
    except Exception:
        opcua_connected = False
    # Database status
    db_status = True
    try:
        # Check if devices table exists
        result = db.query(Device).first()
        db_status = result is not None
    except Exception:
        db_status = False
    # Uptime
    uptime = (datetime.datetime.utcnow() - start_time).total_seconds()
    return {
        "opcua_connected": opcua_connected,
        "db_status": db_status,
        "uptime_seconds": int(uptime)
    }

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
        # List of hierarchical node paths to read (expand as needed)
        nodes_to_read = [
            ("AllgemeineParameter", [
                "SkalierungDruckmessungMin",
                "SkalierungDruckmessungMax",
                "SkalierungDurchflussmessungMin",
                "SkalierungDurchflussmessungMax",
                "Fehlerbit"
            ]),
            ("Ventilkonfiguration", [
                "VentilanzahlInVerwendung",
                "VentilSperre",
                "PWM.Anregung",
                "PWM.Anregungszeit",
                "PWM.Zwischenerregung",
                "PWM.Zwischenerregungszeit",
                "PWM.Halten",
                "KonfigÜbernehmen"
            ])
            # Add more blocks/categories here
        ]
        for block, variables in nodes_to_read:
            for var in variables:
                node_id = f"ns=2;s={block}.{var}" if "." in var else f"ns=2;s={block}.{var}"
                try:
                    value = sim_client.get_node(node_id).get_value()
                except Exception:
                    value = None
                # Use block and var as device/type/index for DB (customize as needed)
                device_name = block
                value_type = var
                index = None
                # Store in DB (simplified, you may want to adjust schema)
                device = db.query(Device).filter_by(name=device_name).first()
                if not device:
                    device = Device(name=device_name)
                    db.add(device)
                    db.commit()
                    db.refresh(device)
                curr = db.query(CurrentValue).filter_by(device_id=device.id, type=value_type, index=0).first()
                if curr:
                    curr.value = value
                    curr.node_id = node_id
                else:
                    curr = CurrentValue(device_id=device.id, type=value_type, index=0, node_id=node_id, value=value)
                    db.add(curr)
                db.add(HistoricalValue(device_id=device.id, type=value_type, index=0, node_id=node_id, value=value, timestamp=datetime.datetime.utcnow().isoformat()))
        db.commit()
        db.close()
        time.sleep(5)

threading.Thread(target=background_store_values, daemon=True).start()

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
