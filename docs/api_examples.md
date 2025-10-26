# API Examples

This document contains quick curl examples for the REST API exposed by the backends (Python or C#).

Assumes backend runs at [http://localhost:8000](http://localhost:8000)

1. Status

```bash
curl http://localhost:8000/status
```

1. Get simulated values (sim)

```bash
curl http://localhost:8000/sim_values
```

1. Get parameter values (param)

```bash
curl http://localhost:8000/param_values
```

1. Read an arbitrary OPC UA node via REST

```bash
curl -G --data-urlencode "nodeId=ns=2;s=Device1.SimValue1" http://localhost:8000/read_opcua
```

1. Write an arbitrary OPC UA node via REST (JSON body)

```bash
curl -X POST -H "Content-Type: application/json" -d '{"nodeId":"ns=2;s=Device1.ParamValue1","value":42.5}' http://localhost:8000/write_opcua
```

1. Historical values

```bash
curl "http://localhost:8000/historical_values?deviceId=1&type=sim&index=1&limit=10"
```
