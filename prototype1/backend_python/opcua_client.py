from opcua import Client

OPCUA_SERVER_URL = "opc.tcp://localhost:4840"  # Anpassen!

client = Client(OPCUA_SERVER_URL)
client.connect()

def read_opcua_value(node_id: str):
    node = client.get_node(node_id)
    return node.get_value()

def write_opcua_value(node_id: str, value):
    node = client.get_node(node_id)
    try:
        node.set_value(value)
        return True
    except Exception:
        return False
