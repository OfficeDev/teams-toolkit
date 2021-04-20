// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
namespace Microsoft.TeamsFx.SimpleAuth.Models
{
    public class PostTokenRequestBody
    {
        public string redirect_uri { get; set; }
        public string code { get; set; }
        public string code_verifier { get; set; }
        public string grant_type { get; set; }
        public string scope { get; set; }
    }
}
