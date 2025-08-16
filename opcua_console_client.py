from opcua import Client
import time

OPCUA_SERVER_URL = "opc.tcp://localhost:4840"
NUM_DEVICES = 10
NUM_VALUES = 10

client = Client(OPCUA_SERVER_URL)
client.connect()
print("Connected to OPC UA Simulation Server.")

try:
    while True:
        print("--- OPC UA Device Values ---")
        for d in range(NUM_DEVICES):
            print(f"Device {d+1}:")
            for i in range(NUM_VALUES):
                sim_node_id = f"ns=2;s=Device{d+1}.SimValue{i+1}"
                param_node_id = f"ns=2;s=Device{d+1}.ParamValue{i+1}"
                sim_node = client.get_node(sim_node_id)
                param_node = client.get_node(param_node_id)
                sim_value = sim_node.get_value()
                param_value = param_node.get_value()
                print(f"  SimValue{i+1}: {sim_value}")
                print(f"  ParamValue{i+1}: {param_value}")
            print("")
        print("---------------------\n")
        time.sleep(2)
except KeyboardInterrupt:
    print("Exiting...")
finally:
    client.disconnect()
