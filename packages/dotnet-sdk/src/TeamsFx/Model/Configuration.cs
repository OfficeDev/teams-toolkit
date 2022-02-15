// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
namespace Microsoft.TeamsFx.Model;
#nullable enable

/// <summary>
/// (Unused) Available resource type.
/// </summary>
internal enum ResourceType
{
    /// <summary>
    /// SQL database.
    /// </summary>
    SQL = 0,
    /// <summary>
    /// Rest API.
    /// </summary>
    API
}

/// <summary>
/// (Unused) Configuration for resources.
/// </summary>
internal class ResourceConfiguration
{
    /// <summary>
    /// Resource type.
    /// </summary>
    public ResourceType Type { get; }
    /// <summary>
    /// Resource name.
    /// </summary>
    public string Name { get; }
    /// <summary>
    /// Config for the resource.
    /// </summary>
    public Dictionary<string, object> Properties { get; }

    /// <summary>
    /// The constructor of ResourceConfiguration.
    /// </summary>
    public ResourceConfiguration(ResourceType type, string name = "", Dictionary<string, object>? properties = null)
    {
        Type = type;
        Name = name;
        Properties = properties ?? new Dictionary<string, object>();
    }
}