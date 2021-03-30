namespace Microsoft.Azure.WebJobs.Extensions.TeamsFx
{
    public class TeamsFxConfig
    {
        public string AccessToken { get; set; }
        public string ClientId { get; set; }
        public string ClientSecret { get; set; }
        public string OAuthAuthority { get; set; }
        public string FunctionEndpoint { get; set; }
        public string IdentityId { get; set; }
        public string SqlEndpoint { get; set; }
        public string Database { get; set; }
    }
}
