from opcua import Server
import time
import threading
import random
from opcua import ua

class OPCUASimulationServer:
    def __init__(self, num_devices=10, num_values=10):
        self.server = Server()
        self.server.set_endpoint("opc.tcp://0.0.0.0:4840")
        self.server.set_server_name("OPC UA Simulationsserver")
        self.idx = self.server.register_namespace("http://testpython/simulation/")
        self.objects = self.server.get_objects_node()
        self.num_devices = num_devices
        self.num_values = num_values
        self.device_nodes = []  # List of device nodes
        self.sim_values = []    # List of lists: sim_values[device][value]
        self.param_values = []  # List of lists: param_values[device][value]
        self._setup_devices()

    def _setup_devices(self):
        for d in range(self.num_devices):
            device_name = f"Device{d+1}"
            device_node = self.objects.add_object(self.idx, device_name)
            self.device_nodes.append(device_node)
            sim_vars = []
            param_vars = []
            for i in range(self.num_values):
                sim_str_id = f"{device_name}.SimValue{i+1}"
                param_str_id = f"{device_name}.ParamValue{i+1}"
                sim_nodeid = ua.NodeId(sim_str_id, self.idx)
                param_nodeid = ua.NodeId(param_str_id, self.idx)
                sim_var = device_node.add_variable(sim_nodeid, sim_str_id, 0.0)
                sim_var.set_writable()
                sim_vars.append(sim_var)
                param_var = device_node.add_variable(param_nodeid, param_str_id, 0.0)
                param_var.set_writable()
                param_vars.append(param_var)
            self.sim_values.append(sim_vars)
            self.param_values.append(param_vars)

    def start(self):
        self.server.start()
        print("OPC UA Simulationsserver läuft auf opc.tcp://0.0.0.0:4840/")
        threading.Thread(target=self._update_simulation, daemon=True).start()

    def _update_simulation(self):
        while True:
            for d, sim_vars in enumerate(self.sim_values):
                for i, var in enumerate(sim_vars):
                    if i < 3:
                        value = random.uniform(1.0, 10.0)
                    elif i < 6:
                        value = random.uniform(20.0, 100.0)
                    else:
                        value = random.uniform(0.1, 5.0)
                    var.set_value(value)
            time.sleep(1)
    def set_parameter_value(self, device, param_index, value):
        self.param_values[device][param_index].set_value(value)
        print(f"Received: Device {device+1} ParamValue{param_index+1} set to {value}")

if __name__ == "__main__":
    server = OPCUASimulationServer(num_devices=10, num_values=10)
    server.start()
    while True:
        time.sleep(1)
