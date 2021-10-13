// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

using System;

namespace Microsoft.TeamsFx.Model
{
    internal class AccessToken
    {
        public string Token { get; set; }
        public DateTimeOffset ExpiresOn { get; set; }

        private readonly static TimeSpan s_tokenRefreshTimeSpan = new(0, 5, 0);

        public AccessToken(string token, DateTimeOffset expiresOn)
        {
            Token = token;
            ExpiresOn = expiresOn;
        }

        public Azure.Core.AccessToken ToAzureAccessToken()
        {
            return new Azure.Core.AccessToken(Token, ExpiresOn);
        }

        public bool NearExpiration()
        {
            return ExpiresOn.Subtract(DateTimeOffset.Now) <= s_tokenRefreshTimeSpan;
        }
    }
}
