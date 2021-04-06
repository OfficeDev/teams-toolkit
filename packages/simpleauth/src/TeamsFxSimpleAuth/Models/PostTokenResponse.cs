using System;

namespace Microsoft.TeamsFxSimpleAuth.Models
{
    public class PostTokenResponse
    {
        public string scope { get; set; }
        public DateTimeOffset expires_on { get; set; }
        public string access_token { get; set; }
    }
}
