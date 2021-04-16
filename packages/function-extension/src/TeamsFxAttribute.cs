// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

using System;
using Microsoft.Azure.WebJobs.Description;

namespace Microsoft.Azure.WebJobs.Extensions.TeamsFx
{
    [Binding]
    [AttributeUsage(AttributeTargets.Parameter)]
    public sealed class TeamsFxAttribute : Attribute
    {
        public TeamsFxAttribute()
        {
            ClientId = Environment.GetEnvironmentVariable(ConfigurationNames.ClientId);
            ClientSecret = Environment.GetEnvironmentVariable(ConfigurationNames.ClientSecret);
            AllowedAppIds = Environment.GetEnvironmentVariable(ConfigurationNames.AllowedAppIds);
            string authorityHost = Environment.GetEnvironmentVariable(ConfigurationNames.OAuthAuthorityHost);
            string tenantId = Environment.GetEnvironmentVariable(ConfigurationNames.TenantId);
            if (authorityHost != null && tenantId != null)
            {
                OAuthAuthority = authorityHost.TrimEnd('/') + '/' + tenantId;
            }

            var TokenRefreshBufferMinutesConfig = Environment.GetEnvironmentVariable(ConfigurationNames.TokenRefreshBufferMinutes);
            if (int.TryParse(TokenRefreshBufferMinutesConfig, out int bufferMinutes))
            {
                TokenRefreshBufferMinutes = bufferMinutes;
            }
            else
            {
                TokenRefreshBufferMinutes = 5; // Follow MSAL's refresh policy
            }
        }

        public string ClientId { get; private set; }
        public string ClientSecret { get; private set; }
        public string OAuthAuthority { get; set; }
        public string AllowedAppIds { get; set; }

        // Refresh token if token expires in TokenRefreshBufferMinutes minutes
        public int TokenRefreshBufferMinutes { get; private set; }
    }
}
