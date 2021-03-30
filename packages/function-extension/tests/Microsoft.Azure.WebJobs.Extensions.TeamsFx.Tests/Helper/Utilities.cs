using System;
using Microsoft.Identity.Client;
using System.Threading.Tasks;

namespace Microsoft.Azure.WebJobs.Extensions.TeamsFx.Tests.Helper
{
    public class Utilities
    {
        public static async Task<string> GetApplicationAccessTokenAsync(string clientId, string clientSecret, string oAuthAuthority)
        {
            if (String.IsNullOrEmpty(clientId))
            {
                throw new ArgumentException(nameof(clientId));
            }
            if (String.IsNullOrEmpty(clientSecret))
            {
                throw new ArgumentException(nameof(clientSecret));
            }
            if (String.IsNullOrEmpty(oAuthAuthority))
            {
                throw new ArgumentException(nameof(oAuthAuthority));
            }

            IConfidentialClientApplication confidentialClientApplication = ConfidentialClientApplicationBuilder
                .Create(clientId)
                .WithAuthority(oAuthAuthority)
                .WithClientSecret(clientSecret)
                .Build();
            string[] scopes = new string[] { clientId + "/.default" };
            AuthenticationResult result;
            try
            {
                result = await confidentialClientApplication.AcquireTokenForClient(scopes).ExecuteAsync();
            }
            catch (Exception ex)
            {
                throw new Exception(String.Format("Fail to acquire aplication token for client id {0}. {1}", clientId, ex.Message));
            }
            if (String.IsNullOrEmpty(result.AccessToken))
            {
                throw new ArgumentNullException(nameof(result.AccessToken));
            }
            return result.AccessToken;
        }
    }
}
