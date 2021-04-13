namespace Microsoft.TeamsFx.SimpleAuth.Tests.Models
{
    public class PasswordCredentialRequestBody
    {
        public string Grant_type { get; set; }
        public string Username { get; set; }
        public string Password { get; set; }
        public string Client_id { get; set; }
        public string Client_secret { get; set; }
        public string Scope { get; set; }
    }
}
