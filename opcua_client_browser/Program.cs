    using System;

    using Opc.UaFx;
using Opc.UaFx.Client;
    
namespace opcua_client_browser;

public class Program
{

    public static void Main(string[] args)
    {

        var client = new OpcClient("opc.tcp://172.22.0.2:4842");
        client.Connect();

        var node = client.BrowseNode(OpcObjectTypes.ObjectsFolder);
        Program.Browse(node);

        client.Disconnect();
        Console.ReadKey(true);
    }


    private static void Browse(OpcNodeInfo node)
    {
        Program.Browse(node, 0);
    }

    private static void Browse(OpcNodeInfo node, int level)
    {
        var displayName = node.Attribute(OpcAttribute.DisplayName);

        Console.WriteLine(
                "{0}{1} ({2})",
                new string(' ', level * 4),
                node.NodeId.ToString(OpcNodeIdFormat.Foundation),
                displayName.Value);

        // Browse the children of the node and continue browsing in preorder.
        foreach (var childNode in node.Children())
            Program.Browse(childNode, level + 1);
    }

}
