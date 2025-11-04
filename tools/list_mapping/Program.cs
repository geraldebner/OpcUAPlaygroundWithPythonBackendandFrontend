using System.Xml.Linq;

// attempt to locate SPSData/Mapping_Ventiltester.xml by walking up from current directory
string? path = null;
var cur = new DirectoryInfo(Directory.GetCurrentDirectory());
while (cur != null)
{
    var candidate = Path.Combine(cur.FullName, "SPSData", "Mapping_Ventiltester.xml");
    if (File.Exists(candidate)) { path = candidate; break; }
    cur = cur.Parent;
}
if (path == null)
{
    Console.Error.WriteLine("Mapping file not found (searched upwards for SPSData/Mapping_Ventiltester.xml)");
    return 1;
}

var doc = XDocument.Load(path);
var mappingsRoot = doc.Root?.Element("Mappings");
if (mappingsRoot == null)
{
    Console.WriteLine("No Mappings element");
    return 0;
}

var targetBlock = 2;
var groups = new Dictionary<string, List<string>>();

foreach (var dbSection in mappingsRoot.Elements())
{
    var sectionName = dbSection.Name.LocalName;
    var groupName = sectionName;
    if (groupName.StartsWith("DB_")) groupName = groupName.Substring(3);
    var idx = groupName.IndexOf("_1-4");
    if (idx >= 0) groupName = groupName.Substring(0, idx);

    foreach (var blockEl in dbSection.Elements().Where(e => e.Name.LocalName.StartsWith("Block", StringComparison.OrdinalIgnoreCase)))
    {
        var blockName = blockEl.Name.LocalName;
        if (!int.TryParse(new string(blockName.Where(char.IsDigit).ToArray()), out var blockIdx)) continue;
        if (blockIdx != targetBlock) continue;

        foreach (var mapping in blockEl.Descendants("Mapping"))
        {
            var parent = mapping.Parent;
            string? subgroup = null;
            if (parent != null && !string.Equals(parent.Name.LocalName, blockEl.Name.LocalName, StringComparison.OrdinalIgnoreCase))
            {
                subgroup = parent.Name.LocalName;
            }
            var groupKey = groupName;
            if (!string.IsNullOrEmpty(subgroup)) groupKey = groupName + "/" + subgroup;
            if (!groups.TryGetValue(groupKey, out var list)) { list = new List<string>(); groups[groupKey] = list; }
            var label = mapping.Attribute("Label")?.Value ?? "";
            var parts = label.Split('.');
            var param = parts.Length > 0 ? parts.Last() : label;
            list.Add(param);
        }
    }
}

Console.WriteLine($"Found {groups.Count} groups for block {targetBlock}");
foreach (var kv in groups.OrderBy(kv=>kv.Key))
{
    Console.WriteLine($"- {kv.Key} ({kv.Value.Count} params)");
}

return 0;