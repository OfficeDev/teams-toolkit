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
            OAuthAuthority = Environment.GetEnvironmentVariable(ConfigurationNames.OAuthAuthority);
            AllowedAppIds = Environment.GetEnvironmentVariable(ConfigurationNames.AllowedAppIds);
            FunctionEndpoint = Environment.GetEnvironmentVariable(ConfigurationNames.FunctionEndpoint);
            IdentityId = Environment.GetEnvironmentVariable(ConfigurationNames.IdentityId);
            SqlEndpoint = Environment.GetEnvironmentVariable(ConfigurationNames.SqlEndpoint);
            Database = Environment.GetEnvironmentVariable(ConfigurationNames.DatabaseName);

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
        public string FunctionEndpoint { get; set; }
        public string IdentityId { get; set; }
        public string SqlEndpoint { get; set; }
        public string Database { get; set; }

        // Refresh token if token expires in TokenRefreshBufferMinutes minutes
        public int TokenRefreshBufferMinutes { get; private set; }
    }
}
