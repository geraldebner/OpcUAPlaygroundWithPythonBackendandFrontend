using Opc.UaFx.Client;
using System.Text.Json;
using VentilTesterBackend.Models;
using Microsoft.Extensions.Logging;


namespace VentilTesterBackend.Services;


public class OpcUaDataConverter : IDisposable
{
    private readonly ILogger<OpcUaDataConverter>? _logger;
    public OpcUaDataConverter(ILogger<OpcUaDataConverter>? logger = null)
    {        
        _logger = logger;
        
    }

    
    public void Dispose()
    {
        try
        {
           
        }
        catch { }
    }

    // ----------------------- helper methods -----------------------
    public static string NormalizeKey(string s)
    {
        if (string.IsNullOrEmpty(s)) return string.Empty;
        var chars = s.Where(c => char.IsLetterOrDigit(c)).ToArray();
        return new string(chars).ToLowerInvariant();
    }

    public static void SetTypedProperties(object target, IEnumerable<Parameter> parameters)
    {
        if (target == null) return;
        var props = target.GetType().GetProperties(System.Reflection.BindingFlags.Public | System.Reflection.BindingFlags.Instance);
        var propMap = props.ToDictionary(p => NormalizeKey(p.Name), p => p, StringComparer.OrdinalIgnoreCase);
        foreach (var p in parameters)
        {
            try
            {
                var key = NormalizeKey(p.Name);
                if (propMap.TryGetValue(key, out var pi))
                {
                    if (!pi.CanWrite) continue;
                    if (TryConvert(p.Value, pi.PropertyType, out var converted))
                    {
                        pi.SetValue(target, converted);
                    }
                }
            }
            catch { }
        }
    }

    
    public static bool TryConvert(string? raw, Type targetType, out object? converted)
    {
        converted = null;
        if (targetType == typeof(string))
        {
            converted = raw ?? string.Empty;
            return true;
        }
        if (string.IsNullOrEmpty(raw)) return false;
        try
        {
            if (targetType == typeof(bool) || targetType == typeof(bool?))
            {
                if (raw == "0") { converted = false; return true; }
                if (raw == "1") { converted = true; return true; }
                if (bool.TryParse(raw, out var b)) { converted = b; return true; }
                return false;
            }
            if (targetType == typeof(int) || targetType == typeof(int?))
            {
                if (int.TryParse(raw, System.Globalization.NumberStyles.Any, System.Globalization.CultureInfo.InvariantCulture, out var i)) { converted = i; return true; }
                if (double.TryParse(raw, System.Globalization.NumberStyles.Any, System.Globalization.CultureInfo.InvariantCulture, out var d)) { converted = (int)d; return true; }
                return false;
            }
            if (targetType == typeof(double) || targetType == typeof(double?))
            {
                if (double.TryParse(raw, System.Globalization.NumberStyles.Any, System.Globalization.CultureInfo.InvariantCulture, out var d)) { converted = d; return true; }
                return false;
            }
            if (targetType == typeof(byte) || targetType == typeof(byte?))
            {
                if (byte.TryParse(raw, out var b)) { converted = b; return true; }
                if (int.TryParse(raw, out var ib) && ib >= byte.MinValue && ib <= byte.MaxValue) { converted = (byte)ib; return true; }
                return false;
            }
            // try generic change type
            converted = Convert.ChangeType(raw, targetType, System.Globalization.CultureInfo.InvariantCulture);
            return true;
        }
        catch { return false; }
    }

    // Convert raw string value(s) according to mapping metadata for writing to OPC UA nodes.
    // Supports scalar and simple comma-separated arrays when Count>1 or MemoryAccessMode==1.
    public static object? ConvertForWrite(string? raw, NodeMapping.MappingEntry? mapping)
    {
        if (mapping == null)
            return raw;

        // handle arrays
        var isArray = (mapping.Count.HasValue && mapping.Count.Value > 1) || (mapping.MemoryAccessMode.HasValue && mapping.MemoryAccessMode.Value == 1);
        if (isArray)
        {
            if (string.IsNullOrEmpty(raw)) return Array.Empty<string>();
            var parts = raw.Split(',').Select(s => s.Trim()).ToArray();
            // choose element type by DataTypeId
            switch (mapping.DataTypeId)
            {
                case 1: // Boolean
                    return parts.Select(p => p == "1" || string.Equals(p, "true", StringComparison.OrdinalIgnoreCase)).ToArray();
                case 4: // Int16
                    return parts.Select(p => short.TryParse(p, System.Globalization.NumberStyles.Any, System.Globalization.CultureInfo.InvariantCulture, out var v) ? v : (short)0).ToArray();
                case 6: // Int32
                    return parts.Select(p => int.TryParse(p, System.Globalization.NumberStyles.Any, System.Globalization.CultureInfo.InvariantCulture, out var v) ? v : 0).ToArray();
                case 7: // UInt32
                    return parts.Select(p => uint.TryParse(p, System.Globalization.NumberStyles.Any, System.Globalization.CultureInfo.InvariantCulture, out var v) ? v : 0u).ToArray();
                default:
                    return parts; // string array
            }
        }

        // scalar conversion
        if (!string.IsNullOrEmpty(raw) && mapping.DataTypeId.HasValue)
        {
            switch (mapping.DataTypeId.Value)
            {
                case 1: // Boolean
                    if (raw == "0") return false;
                    if (raw == "1") return true;
                    if (bool.TryParse(raw, out var b)) return b;
                    return raw; // fallback
                case 4: // Int16
                    if (short.TryParse(raw, System.Globalization.NumberStyles.Any, System.Globalization.CultureInfo.InvariantCulture, out var s)) return s;
                    return raw;
                case 6: // Int32
                    if (int.TryParse(raw, System.Globalization.NumberStyles.Any, System.Globalization.CultureInfo.InvariantCulture, out var i)) return i;
                    return raw;
                case 7: // UInt32
                    if (uint.TryParse(raw, System.Globalization.NumberStyles.Any, System.Globalization.CultureInfo.InvariantCulture, out var u)) return u;
                    return raw;
                default:
                    return raw;
            }
        }

        return raw;
    }

    // Utility to convert read node value to string for API responses. Arrays are serialized as JSON arrays.
    public static string ConvertReadValueToString(object? value)
    {
        if (value == null) return string.Empty;
        if (value is Array)
        {
            try { return JsonSerializer.Serialize(value); } catch { return string.Join(",", ((Array)value).OfType<object>().Select(o => o?.ToString() ?? string.Empty)); }
        }
        return value.ToString() ?? string.Empty;
    }
}
