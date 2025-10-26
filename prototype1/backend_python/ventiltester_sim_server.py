"""
Simple OPC UA simulation server that exposes the nodes listed in
SPSData/Mapping_Ventiltester.xml so the backend/frontend can be tested.

Usage:
  python -m pip install opcua
  python backend_python\ventiltester_sim_server.py

The server listens on opc.tcp://0.0.0.0:4840
"""
import time
import threading
import random
from opcua import Server, ua
import xml.etree.ElementTree as ET
import os


DATA_TYPE_MAP = {
    "1": "Boolean",
    "4": "Int32",
    "6": "Double",
    "7": "Byte",
}


class VentilTesterSimServer:
    def __init__(self, mapping_path=None, endpoint="opc.tcp://0.0.0.0:4840"):
        self.server = Server()
        self.server.set_endpoint(endpoint)
        self.server.set_server_name("VentilTester Simulation Server")

        # Objects folder
        self.objects = self.server.get_objects_node()

        # will hold ua.Node objects keyed by (ns,i)
        self.nodes = {}

        if mapping_path is None:
            mapping_path = os.path.join(os.path.dirname(__file__), "..", "SPSData", "Mapping_Ventiltester.xml")
        mapping_path = os.path.abspath(mapping_path)
        if os.path.exists(mapping_path):
            print("Loading mapping from", mapping_path)
            self._load_mapping(mapping_path)
        else:
            print("Mapping file not found at", mapping_path, "-> starting empty server")

        self._stop = threading.Event()

    def _parse_nodeid(self, nodeid_str):
        # expect format ns=x;i=y  or ns=x;s=string
        parts = nodeid_str.split(';')
        ns = 0
        ident = None
        for p in parts:
            if p.startswith('ns='):
                ns = int(p.split('=')[1])
            elif p.startswith('i='):
                ident = int(p.split('=')[1])
            elif p.startswith('s='):
                ident = p.split('=')[1]
        return ns, ident

    def _load_mapping(self, path):
        tree = ET.parse(path)
        root = tree.getroot()
        mappings = root.find('Mappings')
        if mappings is None:
            return

        # Iterate all Mapping elements and create corresponding variable nodes
        for mapping in mappings.iter('Mapping'):
            label = mapping.get('Label') or ''
            nodeid = mapping.get('NodeId') or ''
            dtype = mapping.get('DataTypeId') or ''

            if not nodeid:
                continue

            ns, ident = self._parse_nodeid(nodeid)
            # create a display name from the label's last token
            name = label.split('.')[-1] if label else f"Var_{ns}_{ident}"

            # choose an initial value based on dtype
            initial = None
            if dtype == '1':
                initial = False
            elif dtype == '4':
                initial = 0
            elif dtype == '6':
                initial = 0.0
            elif dtype == '7':
                initial = 0
            else:
                initial = 0

            try:
                # create UA NodeId and add variable under Objects
                ua_nodeid = ua.NodeId(ident, ns)
                var = self.objects.add_variable(ua_nodeid, name, initial)
                var.set_writable()
                self.nodes[(ns, ident)] = (var, dtype)
            except Exception as e:
                print(f"Failed to create node {nodeid}: {e}")

    def start(self):
        self.server.start()
        print("VentilTester simulation OPC UA server running on", self.server.endpoint)
        # start periodic updates
        t = threading.Thread(target=self._update_loop, daemon=True)
        t.start()

    def _update_loop(self):
        while not self._stop.is_set():
            for (ns, ident), (var, dtype) in list(self.nodes.items()):
                try:
                    if dtype == '6':
                        # double, random small variation
                        val = (var.get_value() or 0.0) + random.uniform(-0.5, 0.5)
                        var.set_value(float(val))
                    elif dtype == '4' or dtype == '7':
                        val = (var.get_value() or 0) + random.randint(-1, 1)
                        var.set_value(int(val))
                    elif dtype == '1':
                        # boolean toggle rarely
                        if random.random() < 0.05:
                            var.set_value(not bool(var.get_value()))
                    else:
                        # default numeric
                        var.set_value(var.get_value() or 0)
                except Exception:
                    pass
            time.sleep(1)

    def stop(self):
        self._stop.set()
        try:
            self.server.stop()
        except Exception:
            pass


if __name__ == '__main__':
    srv = VentilTesterSimServer()
    try:
        srv.start()
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("Shutting down")
        srv.stop()
