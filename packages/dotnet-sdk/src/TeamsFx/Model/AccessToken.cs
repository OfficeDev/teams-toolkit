// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
namespace Microsoft.TeamsFx.Model;

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

    public global::Azure.Core.AccessToken ToAzureAccessToken()
    {
        return new global::Azure.Core.AccessToken(Token, ExpiresOn);
    }

    public bool NearExpiration()
    {
        return ExpiresOn.Subtract(DateTimeOffset.Now) <= s_tokenRefreshTimeSpan;
    }
}
