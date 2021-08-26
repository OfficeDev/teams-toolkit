// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

#nullable enable
using System.Collections.Generic;

namespace Microsoft.TeamsFx.Model
{
    /// <summary>
    /// Configuration for current environment.
    /// </summary>
    public class Configuration
    {
        /// <summary>
        /// Authentication related configuration.
        /// </summary>
        public AuthenticationConfiguration? Authentication { get; }

        /// <summary>
        /// Configuration for resources.
        /// </summary>
        public ResourceConfiguration[]? Resources { get; }

        public Configuration(AuthenticationConfiguration? auth = null, ResourceConfiguration[]? resources = null)
        {
            Authentication = auth;
            Resources = resources;
        }
    }

    /// <summary>
    /// Authentication related configuration.
    /// </summary>
    public class AuthenticationConfiguration
    {
        /// <summary>
        /// Hostname of AAD authority. Default value comes from M365_AUTHORITY_HOST environment variable.
        /// </summary>
        public string? AuthorityHost { get; }
        /// <summary>
        /// AAD tenant id, default value comes from M365_TENANT_ID environment variable.
        /// </summary>
        public string? TenantId { get; }
        /// <summary>
        /// The client (application) ID of an App Registration in the tenant. 
        /// Default value comes from M365_CLIENT_ID environment variable.
        /// </summary>
        public string? ClientId { get; }
        /// <summary>
        /// Secret string that the application uses when requesting a token. 
        /// Only used in confidential client applications. 
        /// Can be created in the Azure app registration portal. 
        /// Default value comes from M365_CLIENT_SECRET environment variable.
        /// </summary>
        public string? ClientSecret { get; }
        /// <summary>
        /// Endpoint of auth service provisioned by Teams Framework. 
        /// Default value comes from SIMPLE_AUTH_ENDPOINT environment variable.
        /// </summary>
        public string? SimpleAuthEndpoint { get; }
        /// <summary>
        /// Login page for Teams to redirect to. 
        /// Default value comes from INITIATE_LOGIN_ENDPOINT environment variable.
        /// </summary>
        public string? InitiateLoginEndpoint { get; }
        /// <summary>
        /// Application ID URI. 
        /// Default value comes from M365_APPLICATION_ID_URI environment variable.
        /// </summary>
        public string? ApplicationIdUri { get; }

        public AuthenticationConfiguration(string? authorityHost = null, string? tenantId = null, string? clientId = null,
                                           string? clientSecret = null, string? simpleAuthEndpoint = null,
                                           string? initiateLoginEndpoint = null, string? applicationIdUri = null)
        {
            AuthorityHost = authorityHost;
            TenantId = tenantId;
            ClientId = clientId;
            ClientSecret = clientSecret;
            SimpleAuthEndpoint = simpleAuthEndpoint;
            InitiateLoginEndpoint = initiateLoginEndpoint;
            ApplicationIdUri = applicationIdUri;
        }
    }

    /// <summary>
    /// Available resource type.
    /// </summary>
    public enum ResourceType
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
    /// Configuration for resources.
    /// </summary>
    public class ResourceConfiguration
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

        public ResourceConfiguration(ResourceType type, string name = "", Dictionary<string, object>? properties = null)
        {
            Type = type;
            Name = name;
            Properties = properties ?? new Dictionary<string, object>();
        }
    }
}
