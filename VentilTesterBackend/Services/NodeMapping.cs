using System.Xml.Linq;

namespace VentilTesterBackend.Services;

/// <summary>
/// Parses SPSData/Mapping_Ventiltester.xml and provides convenient lookup from (block, group, param) -> NodeId
/// The parser is forgiving: it reads Mapping elements under each DB_* section and collects Mapping/@Label and Mapping/@NodeId.
/// Group names are derived from the DB_... section name (DB_AllgemeineParameter_1-4 -> AllgemeineParameter). If Mapping elements are nested
/// under sub-elements (e.g. &lt;Strom&gt;), the subgroup name is appended to the group key as "Group/Subgroup".
/// </summary>
public class NodeMapping
{
    /// <summary>
    /// Single mapping entry including optional metadata present in the XML mapping file.
    /// </summary>
    public record MappingEntry(string Param, string NodeId, int? DataTypeId = null, int? Count = null, int? MemoryAccessMode = null);

    // block -> groupKey -> list of mapping entries
    private readonly Dictionary<int, Dictionary<string, List<MappingEntry>>> _map = new();

    public NodeMapping(IConfiguration config)
    {
        var path = config.GetValue<string>("SpsMappingPath") ?? "SPSData/Mapping_Ventiltester.xml";
        try
        {
            var full = Path.GetFullPath(Path.Combine(Directory.GetCurrentDirectory(), path));
            if (File.Exists(full))
            {
                LoadFromFile(full);
            }
        }
        catch
        {
            // ignore - mapping will remain empty
        }
    }

    private void LoadFromFile(string filePath)
    {
        var doc = XDocument.Load(filePath);
        var mappingsRoot = doc.Root?.Element("Mappings");
        if (mappingsRoot == null) return;

        foreach (var dbSection in mappingsRoot.Elements())
        {
            // dbSection.Name could be e.g. DB_AllgemeineParameter_1-4
            var sectionName = dbSection.Name.LocalName;
            var groupName = sectionName;
            if (groupName.StartsWith("DB_")) groupName = groupName.Substring(3);
            // remove suffix like _1-4
            var idx = groupName.IndexOf("_1-4");
            if (idx >= 0) groupName = groupName.Substring(0, idx);

            // iterate Block1..Block4 inside
            foreach (var blockEl in dbSection.Elements().Where(e => e.Name.LocalName.StartsWith("Block", StringComparison.OrdinalIgnoreCase)))
            {
                var blockName = blockEl.Name.LocalName; // Block1
                if (!int.TryParse(new string(blockName.Where(char.IsDigit).ToArray()), out var blockIdx)) continue;
                if (!_map.TryGetValue(blockIdx, out var groups))
                {
                    groups = new Dictionary<string, List<MappingEntry>>();
                    _map[blockIdx] = groups;
                }

                // collect Mapping elements anywhere under this block (including nested subgroup elements)
                foreach (var mapping in blockEl.Descendants("Mapping"))
                {
                    var label = mapping.Attribute("Label")?.Value ?? string.Empty;
                    var nodeId = mapping.Attribute("NodeId")?.Value ?? string.Empty;

                    // optional metadata attributes
                    int? dataTypeId = null;
                    int? count = null;
                    int? memoryAccessMode = null;
                    if (int.TryParse(mapping.Attribute("DataTypeId")?.Value, out var dt)) dataTypeId = dt;
                    if (int.TryParse(mapping.Attribute("Count")?.Value, out var c)) count = c;
                    if (int.TryParse(mapping.Attribute("MemoryAccessMode")?.Value, out var mam)) memoryAccessMode = mam;

                    if (string.IsNullOrEmpty(label) || string.IsNullOrEmpty(nodeId)) continue;

                    // label typically like Block1.DB_AllgemeineParameter_1.SkalierungDruckmessungMin
                    var parts = label.Split('.');
                    string param = parts.Length > 0 ? parts.Last() : label;

                    // determine subgroup if mapping is nested under an element other than the block
                    string? subgroup = null;
                    var parent = mapping.Parent;
                    if (parent != null && !string.Equals(parent.Name.LocalName, blockEl.Name.LocalName, StringComparison.OrdinalIgnoreCase))
                    {
                        subgroup = parent.Name.LocalName;
                    }

                    var groupKey = groupName;
                    if (!string.IsNullOrEmpty(subgroup)) groupKey = groupName + "/" + subgroup;

                    if (!groups.TryGetValue(groupKey, out var list))
                    {
                        list = new List<MappingEntry>();
                        groups[groupKey] = list;
                    }
                    list.Add(new MappingEntry(param, nodeId, dataTypeId, count, memoryAccessMode));
                }
            }
        }
    }

    /// <summary>
    /// Returns groups and their parameters (param,nodeId) for a given block index. If mapping not available returns empty dictionary.
    /// </summary>
    /// <summary>
    /// Backwards-compatible view: returns group -> list of (Param, NodeId) tuples.
    /// </summary>
    public IReadOnlyDictionary<string, List<(string Param, string NodeId)>> GetGroupsForBlock(int blockIndex)
    {
        if (_map.TryGetValue(blockIndex, out var groups))
        {
            return groups.ToDictionary(kv => kv.Key, kv => kv.Value.Select(e => (e.Param, e.NodeId)).ToList());
        }
        return new Dictionary<string, List<(string, string)>>();
    }

    /// <summary>
    /// Returns the raw mapping entries including optional metadata (DataTypeId, Count, MemoryAccessMode).
    /// </summary>
    public IReadOnlyDictionary<string, List<MappingEntry>> GetGroupsForBlockWithMetadata(int blockIndex)
    {
        if (_map.TryGetValue(blockIndex, out var groups))
        {
            return groups.ToDictionary(kv => kv.Key, kv => kv.Value);
        }
        return new Dictionary<string, List<MappingEntry>>();
    }

    public string? GetNodeId(int blockIndex, string groupKey, string paramName)
    {
        var entry = GetMappingEntry(blockIndex, groupKey, paramName);
        return entry?.NodeId;
    }

    /// <summary>
    /// Returns the <see cref="MappingEntry"/> for the given block/group/param or null when not found.
    /// </summary>
    public MappingEntry? GetMappingEntry(int blockIndex, string groupKey, string paramName)
    {
        if (_map.TryGetValue(blockIndex, out var groups))
        {
            if (groups.TryGetValue(groupKey, out var list))
            {
                var entry = list.FirstOrDefault(x => string.Equals(x.Param, paramName, StringComparison.OrdinalIgnoreCase));
                if (entry != null && !string.IsNullOrEmpty(entry.NodeId)) return entry;
            }
        }
        return null;
    }
}
