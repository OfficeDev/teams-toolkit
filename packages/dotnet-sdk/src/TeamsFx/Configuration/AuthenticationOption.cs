// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

using System.ComponentModel.DataAnnotations;

namespace Microsoft.TeamsFx.Configuration
{
    /// <summary>
    /// Authentication related configuration.
    /// </summary>
    public class AuthenticationOptions
    {
        /// <summary>
        /// Entry name in configuration file.
        /// </summary>
        public const string Authentication = "TeamsFxAuthentication";

        /// <summary>
        /// Hostname of AAD authority.
        /// </summary>
        [RegularExpression(@"^http(s)?://[-a-zA-Z0-9@:%._\+~#=]{1,100}$")]
        public string AuthorityHost { get; set; }

        /// <summary>
        /// AAD tenant id.
        /// </summary>
        public string TenantId { get; set; }

        /// <summary>
        /// The client (application) ID of an App Registration in the tenant.
        /// </summary>
        [RegularExpression(@"^[0-9A-Fa-f\-]{36}$")]
        public string ClientId { get; set; }

        /// <summary>
        /// Secret string that the application uses when requesting a token. 
        /// Only used in confidential client applications. 
        /// Can be created in the Azure app registration portal.
        /// </summary>
        public string ClientSecret { get; set; }

        /// <summary>
        /// Endpoint of auth service provisioned by Teams Framework.
        /// </summary>
        [RegularExpression(@"^http(s)?://[-a-zA-Z0-9@:%._\+~#=]{1,100}$")]
        public string SimpleAuthEndpoint { get; set; }

        /// <summary>
        /// Login page for Teams to redirect to.
        /// </summary>
        public string InitiateLoginEndpoint { get; set; }

        /// <summary>
        /// Application ID URI.
        /// </summary>
        public string ApplicationIdUri { get; set; }
    }
}
