// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
using System;

namespace Microsoft.TeamsFx.SimpleAuth.Models
{
    public class PostTokenResponse
    {
        public string scope { get; set; }
        public DateTimeOffset expires_on { get; set; }
        public string access_token { get; set; }
    }
}
