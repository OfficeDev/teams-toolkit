// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
using Newtonsoft.Json;

namespace Microsoft.TeamsFx.SimpleAuth.Tests.Models
{
    public class TokenResponse
    {
        [JsonProperty("scope")]
        public string Scope { get; set; }
        [JsonProperty("token_type")]
        public string tokenType { get; set; }
        [JsonProperty("ext_expires_in")]
        public int extExpiresIn { get; set; }
        [JsonProperty("expires_in")]
        public int ExpiresIn { get; set; }
        [JsonProperty("access_token")]
        public string AccessToken { get; set; }
    }
}
