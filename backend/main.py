from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.orm import Session
from backend.models import Base, engine, get_db, OPCUAData
from backend.opcua_client import read_opcua_value, write_opcua_value
from opcua import Client
import uvicorn

app = FastAPI()

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
    return db.query(OPCUAData).all()

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
    db_data = OPCUAData(node_id=data.node_id, value=data.value)
    db.add(db_data)
    db.commit()
    db.refresh(db_data)
    return db_data

# OPC UA Simulationsserver-Client
OPCUA_SERVER_URL = "opc.tcp://localhost:4840"
sim_client = Client(OPCUA_SERVER_URL)
sim_client.connect()

#SIM_NODE_IDS = [f"ns=2;s=SimValue{i+1}" for i in range(10)]
SIM_NODE_IDS = [f"ns=2;i={i+1}" for i in range(10)]
#PARAM_NODE_IDS = [f"ns=2;s=ParamValue{i+1}" for i in range(10)]
PARAM_NODE_IDS = [f"ns=2;i={i+10}" for i in range(10)]

@app.get("/sim_values")
def get_sim_values():
    values = []
    for node_id in SIM_NODE_IDS:
        node = sim_client.get_node(node_id)
        values.append({"node_id": node_id, "value": node.get_value()})
    for node_id in PARAM_NODE_IDS:
        node = sim_client.get_node(node_id)
        values.append({"node_id": node_id, "value": node.get_value()})
    return values

@app.get("/param_values")
def get_param_values():
    values = []
    for node_id in PARAM_NODE_IDS:
        node = sim_client.get_node(node_id)
        values.append({"node_id": node_id, "value": node.get_value()})
    return values

class ParamValueIn(BaseModel):
    node_id: str
    value: float

@app.post("/param_values")
def set_param_value(data: ParamValueIn):
    node = sim_client.get_node(data.node_id)
    try:
        node.set_value(data.value)
        return {"status": "ok"}
    except Exception:
        raise HTTPException(status_code=400, detail="Write failed")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
