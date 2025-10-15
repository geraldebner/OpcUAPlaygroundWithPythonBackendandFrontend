using System;
using System.Threading.Tasks.Dataflow;
using Opc.UaFx.Client;

namespace opcua_simple_console_client;

/// <summary>
/// This sample demonstrates how to implement a primitive OPC UA client.
/// </summary>
public class TestClient
{
    
    
    //OpcClient client = new OpcClient("opc.tcp://localhost:4840");
    OpcClient client = new OpcClient("opc.tcp://172.22.0.2:4842");

    public void RunTest()
    {
        client.Connect();
        Read();
        Write();
        Subscribe();
        client.Disconnect();


    }

    private void Read()
    {
        Console.WriteLine("Test READ:");
        //Console.WriteLine("ReadNode: {0}", client.ReadNode("ns=2;s=Device1.SimValue1"));
        Console.WriteLine("ReadNode: {0}", client.ReadNode("ns=5;i=6882"));
    }

    private void Write()
    {
        Console.WriteLine("Test WRITE:");
        /*Console.WriteLine("ReadNode: {0}", client.ReadNode("ns=2;s=Device1.ParamValue1"));
        client.WriteNode("ns=2;s=Device1.ParamValue1", false);
        Console.WriteLine("ReadNode: {0}", client.ReadNode("ns=2;s=Device1.ParamValue1"));*/

        Console.WriteLine("ReadNode: {0}", client.ReadNode("ns=5;i=6882"));
        client.WriteNode("ns=5;i=6882", System.Convert.ToUInt32(190));
        Console.WriteLine("ReadNode: {0}", client.ReadNode("ns=5;i=6882"));
    }

    

    private void Subscribe()
    {
        Console.WriteLine("Test SUBSCRIBE:");
        client.SubscribeNodes(
            new OpcSubscribeDataChange("ns=5;i=6882", HandleEventReceived));
            //new OpcSubscribeDataChange("ns=2;s=Device1.SimValue2", HandleEventReceived));

        Console.WriteLine("ReadNode: {0}", client.ReadNode("ns=2;s=Device1.SimValue1"));
    
        for (int i = 0; i < 30; i++)
        {
            //client.WriteNode("ns=2;s=Device1.ParamValue1", i);
            System.Threading.Thread.Sleep(1000);
        }
    }

     public  void HandleEventReceived(object sender, OpcDataChangeReceivedEventArgs e)
    {
        Console.WriteLine("DataChange: {0} = {1}", e.MonitoredItem.NodeId, e.Item.Value);
    }
}