from opcua import Client
import time

OPCUA_SERVER_URL = "opc.tcp://localhost:4840"
#SIM_NODE_IDS = [f"ns=2;s=SimValue{i+1}" for i in range(10)]
SIM_NODE_IDS = [f"ns=2;i={i+1}" for i in range(10)]
#PARAM_NODE_IDS = [f"ns=2;s=ParamValue{i+1}" for i in range(10)]
PARAM_NODE_IDS = [f"ns=2;i={i+10}" for i in range(10)]

client = Client(OPCUA_SERVER_URL)
client.connect()
print("Connected to OPC UA Simulation Server.")

try:
    while True:
        print("--- OPC UA Values ---")
        for node_id in SIM_NODE_IDS + PARAM_NODE_IDS:
            node = client.get_node(node_id)
            value = node.get_value()
            print(f"{node_id}: {value}")
        print("---------------------\n")
        time.sleep(2)
except KeyboardInterrupt:
    print("Exiting...")
finally:
    client.disconnect()
