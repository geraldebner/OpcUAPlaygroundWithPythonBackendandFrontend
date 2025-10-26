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
        client.Configuration.ApplicationName = "My OPC UA Client";
        Opc.UaFx.Licenser.LicenseKey = "AALSA4IRQPJKOGVQOZP32DTKRRNAIWS3CQLTG7ZJIPVOZDVQNOMJQK2OCMDOZNJLS2WNQOEUY5KDHHJWYQSTXUITOEOGOOFL2R5TEIUNNGH2NJJ7MAOLTARFWT44PG55T4YNSD7UIS5L2HI2V2HYXG5TXMFQPZUWWHFP6HWPSPT5BWYINKYDGVAUX6A5OZIKRVWV4WXW46FUFH2MPIEPRPR2CSLVAP75YKJ2NO2J4VPCCUXKDFY55R376ISCC2OUHIAJK52AHCJRCVOLJTG5FIHHJ2O6ROFHLMLKXKLXAYWGZP3A23335J2RADHNAFEU6OCYACNCJNBW7OSOWTJIDTNS52NFF3SKESV2MJ5VR3WSLOHSQTZD5JNNEQUTEMPTDPU6AGQHRZPSCXI2N56KPRZUJMSRWZZC7TK7PHFAP7IUSAFET3WEAI3VWPCYKJMDYC7HUS7CH6BF75RZIRXZBM6JLZAAJMRJZ745K7BD3P7GO35H4MI3SVXLZSOMPZII5RB7ADDIHEWCOXVDXJ5OGGGCKFWZLYJZHVU23W2CKWT2S55KTOSFF46FEPIPJ3OYSD3X5EEOBIGK2REN6WBB45CEY2IXKX67DGXRXIERKLMAYKAJCMPI76M3YHSEBM7QZC6NSXA77B6RKYSXCVVSVXIYJ5BWISCVQIVOMZB5OAP4NQEQET5WTEULXQCTQ4F2ENVSWJSYIYVFFBW26ONE4INCB5GRFGUIDYPHQ6LXR332C7IPTMXCOB45TQOCRL3IL57WV4W3WESAPLOD2R4UZMES664BFFFHVQMGAUVIGUMZSCHPZFARYCVMVR3QK2HBVKOFRQNAHDQMEHZRDHUJE3GONDWY7BB63YR3ZTHLDHMMNO5Y7QSCFALAGAPH2WTHYQAZCFHLDRK3ZWA54SE4WZWLZYMKZAFTHQ3PRBDN7IY4CTMX7JMHM6CON7JDF3LYNCA5RANH5TUH4BNVB34FIMTUDWHCKK6F4RTKVZTFN3BPHMBYZO3PM52GPOSSR4DDSTMXA72V2ROW3SR5T5NBJLP32AVCI2IQNXAXWRYR4W6TVILEM3PLD36SV7UT53FHRV6WR4D2B63OWXD6CKFPE2BENM6NRLUG2VB2KNICBF6KQVNGLIQZHHA56JGW6OLLOPPAV3XPFZCG7IAMCMPRHS6NCSEWNICDY344CI5XT5S3CQTPKATAUCLIKPDWLJLBF4SFMHTL6Q3PYEATE2A42LJWFMXH3FHWEGA36JQJLOSR3QRZEXZOAH6YZWUM6UF7PQKARCOUI3CUYXNUWKH6SE5CI3GHGZUXH46J5ZIAUSEUBYFP5HOXDP5CCZYMS3O4G364MKEU5XCV6OHZM6MEIF5MUXSBE4SKVH5TPCLEFB3X5XHUNHCYKYFESHDEBUWGEN6B";

        Opc.UaFx.Licenser.FailIfExpired();

        Console.WriteLine(Opc.UaFx.Licenser.LicenseInfo);    
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