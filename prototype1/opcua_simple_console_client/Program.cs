using System;
    using Opc.UaFx.Client;

namespace opcua_simple_console_client;

/// <summary>
/// This sample demonstrates how to implement a primitive OPC UA client.
/// </summary>
public class Program
{
       public static void Main(string[] args)
    {
        var testClient = new TestClient();
        testClient.RunTest();   
    
    }

    
}