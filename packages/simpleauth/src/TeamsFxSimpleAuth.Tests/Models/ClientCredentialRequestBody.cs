namespace Microsoft.TeamsFx.SimpleAuth.Tests.Models
{
    class ClientCredentialRequestBody
    {
        public string Grant_type { get; set; }
        public string Client_id { get; set; }
        public string Client_secret { get; set; }
        public string Scope { get; set; }
    }
}
