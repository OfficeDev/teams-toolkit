using Newtonsoft.Json;
using System;

namespace Microsoft.TeamsFxSimpleAuth.Models
{
    public class PostTokenResponse
    {
        [JsonProperty("scope")]
        public string Scope { get; set; }
        [JsonProperty("expires_on")]
        public DateTimeOffset ExpiresOn { get; set; }
        [JsonProperty("access_token")]
        public string AccessToken { get; set; }
    }
}
