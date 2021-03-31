using Newtonsoft.Json;

namespace Microsoft.TeamsFxSimpleAuth.Models
{
    public class PostTokenRequestBody
    {
        [JsonProperty("redirect_uri")]
        public string RedirectUri { get; set; }
        [JsonProperty("code")]
        public string Code { get; set; }
        [JsonProperty("code_verifier")]
        public string CodeVerifier { get; set; }
        [JsonProperty("grant_type")]
        public string GrantType { get; set; }
        [JsonProperty("scope")]
        public string Scope { get; set; }
    }
}
