from opcua import Server
import time
import threading
import random

class OPCUASimulationServer:
    def __init__(self):
        self.server = Server()
        self.server.set_endpoint("opc.tcp://0.0.0.0:4840")
        self.server.set_server_name("OPC UA Simulationsserver")
        self.idx = self.server.register_namespace("http://testpython/simulation/")
        self.objects = self.server.get_objects_node()
        self.sim_values = []
        self.param_values = []
        self._setup_variables()

    def _setup_variables(self):
        # 10 Simulationswerte: Druck, Temperatur, Schaltzeiten
        for i in range(10):
            var = self.objects.add_variable(self.idx, f"SimValue{i+1}", 0.0)
            var.set_writable()
            self.sim_values.append(var)
        # 10 Parameterwerte, die vom Client geschrieben werden können
        for i in range(10):
            var = self.objects.add_variable(self.idx, f"ParamValue{i+1}", 0.0)
            var.set_writable()
            self.param_values.append(var)

    def start(self):
        self.server.start()
        print("OPC UA Simulationsserver läuft auf opc.tcp://0.0.0.0:4840/")
        threading.Thread(target=self._update_simulation, daemon=True).start()

    def _update_simulation(self):
        while True:
            # Druck, Temperatur, Schaltzeiten simulieren
            for i, var in enumerate(self.sim_values):
                if i < 3:
                    # Druck
                    var.set_value(random.uniform(1.0, 10.0))
                elif i < 6:
                    # Temperatur
                    var.set_value(random.uniform(20.0, 100.0))
                else:
                    # Schaltzeiten
                    var.set_value(random.uniform(0.1, 5.0))
            time.sleep(1)

if __name__ == "__main__":
    server = OPCUASimulationServer()
    server.start()
    while True:
        time.sleep(1)
