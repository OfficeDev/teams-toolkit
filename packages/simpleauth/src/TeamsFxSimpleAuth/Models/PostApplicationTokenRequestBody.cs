using Newtonsoft.Json;

namespace Microsoft.TeamsFxSimpleAuth.Models
{
    public class PostApplicationTokenRequestBody
    {
        [JsonProperty("scope")]
        public string Scope { get; set; }
    }
}
