namespace Microsoft.TeamsFx.SimpleAuth.Tests.Models
{
    public class IntegrationTestSettings
    {
        public string AdminClientId { get; set; }
        public string AdminClientSecret { get; set; }
        public string TenantId { get; set; }
        public string AuthorizeUrl { get; set; }
        public string ApiAppIdUri { get; set; }
        public string RedirectUri { get; set; }
        public string CodeChallenge { get; set; }
        public string CodeVerifier { get; set; }
        public string TestUsername { get; set; }
        public string TestPassword { get; set; }
        public string Scope { get; set; }
    }
}