from opcua import Client

OPCUA_SERVER_URL = "opc.tcp://localhost:4840"
client = Client(OPCUA_SERVER_URL)
client.connect()

print("Connected to OPC UA Simulation Server.")

# Print all namespaces
ns_array = client.get_namespace_array()
print("Namespaces:")
for idx, ns in enumerate(ns_array):
    print(f"  {idx}: {ns}")

# Print all variable nodes under Objects
print("\nVariables under Objects:")
objects = client.get_objects_node()
for child in objects.get_children():
    print(f"Node: {child}, BrowseName: {child.get_browse_name()}, NodeId: {child.nodeid}")
    # If the child is a variable, print its value
    try:
        value = child.get_value()
        print(f"  Value: {value}")
    except Exception:
        pass

client.disconnect()
