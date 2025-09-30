from opcua import Server
import time
import threading
import random
from opcua import ua

class OPCUASimulationServer:
    def __init__(self):
        self.server = Server()
        self.server.set_endpoint("opc.tcp://0.0.0.0:4840")
        self.server.set_server_name("OPC UA Simulationsserver")
        self.idx = self.server.register_namespace("http://testpython/simulation/")
        self.objects = self.server.get_objects_node()
        self._setup_tree()

    def _setup_tree(self):
        # Example for one block, you can expand this for all blocks/subcategories
        # AllgemeineParameter
        allgemeine = self.objects.add_object(self.idx, "AllgemeineParameter")
        self.skalierung_druck_min = allgemeine.add_variable(self.idx, "SkalierungDruckmessungMin", 0)
        self.skalierung_druck_max = allgemeine.add_variable(self.idx, "SkalierungDruckmessungMax", 0)
        self.skalierung_durchfluss_min = allgemeine.add_variable(self.idx, "SkalierungDurchflussmessungMin", 0)
        self.skalierung_durchfluss_max = allgemeine.add_variable(self.idx, "SkalierungDurchflussmessungMax", 0)
        self.fehlerbit = allgemeine.add_variable(self.idx, "Fehlerbit", 0)
        for v in [self.skalierung_druck_min, self.skalierung_druck_max, self.skalierung_durchfluss_min, self.skalierung_durchfluss_max, self.fehlerbit]:
            v.set_writable()

        # Ventilkonfiguration
        ventilkonfig = self.objects.add_object(self.idx, "Ventilkonfiguration")
        self.ventilanzahl = ventilkonfig.add_variable(self.idx, "VentilanzahlInVerwendung", 0)
        self.ventilsperre = ventilkonfig.add_variable(self.idx, "VentilSperre", 0)
        pwm = ventilkonfig.add_object(self.idx, "PWM")
        self.pwm_anregung = pwm.add_variable(self.idx, "Anregung", 0)
        self.pwm_anregungszeit = pwm.add_variable(self.idx, "Anregungszeit", 0)
        self.pwm_zwischenerregung = pwm.add_variable(self.idx, "Zwischenerregung", 0)
        self.pwm_zwischenerregungszeit = pwm.add_variable(self.idx, "Zwischenerregungszeit", 0)
        self.pwm_halten = pwm.add_variable(self.idx, "Halten", 0)
        self.konfig_uebernehmen = ventilkonfig.add_variable(self.idx, "KonfigÜbernehmen", 0)
        for v in [self.ventilanzahl, self.ventilsperre, self.pwm_anregung, self.pwm_anregungszeit, self.pwm_zwischenerregung, self.pwm_zwischenerregungszeit, self.pwm_halten, self.konfig_uebernehmen]:
            v.set_writable()

        # Add more blocks/subcategories/variables here following your hierarchy

        # Store all variables for simulation update
        self.all_vars = [
            self.skalierung_druck_min, self.skalierung_druck_max, self.skalierung_durchfluss_min, self.skalierung_durchfluss_max, self.fehlerbit,
            self.ventilanzahl, self.ventilsperre, self.pwm_anregung, self.pwm_anregungszeit, self.pwm_zwischenerregung, self.pwm_zwischenerregungszeit, self.pwm_halten, self.konfig_uebernehmen
        ]

    def start(self):
        self.server.start()
        print("OPC UA Simulationsserver läuft auf opc.tcp://0.0.0.0:4840/")
        threading.Thread(target=self._update_simulation, daemon=True).start()

    def _update_simulation(self):
        while True:
            # Update all variables with random values for simulation
            for var in self.all_vars:
                var.set_value(random.uniform(1, 100))
            time.sleep(1)
    def set_parameter_value(self, device, param_index, value):
        self.param_values[device][param_index].set_value(value)
        print(f"Received: Device {device+1} ParamValue{param_index+1} set to {value}")

if __name__ == "__main__":
    server = OPCUASimulationServer()
    server.start()
    while True:
        time.sleep(1)
