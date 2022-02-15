// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
namespace Microsoft.TeamsFx.Helper;

using System.IdentityModel.Tokens.Jwt;

static internal class Utils
{
    static internal JwtSecurityToken ParseJwt(string token)
    {
        if (string.IsNullOrEmpty(token))
        {
            throw new ExceptionWithCode("SSO token is null or empty.", ExceptionCode.InvalidParameter);
        }
        var handler = new JwtSecurityTokenHandler();
        try
        {
            var jsonToken = handler.ReadToken(token);
            if (jsonToken is not JwtSecurityToken tokenS || string.IsNullOrEmpty(tokenS.Payload["exp"].ToString()))
            {
                throw new ExceptionWithCode("Decoded token is null or exp claim does not exists.", ExceptionCode.InternalError);
            }
            return tokenS;
        }
        catch (ArgumentException e)
        {
            var errorMessage = $"Parse jwt token failed with error: {e.Message}";
            throw new ExceptionWithCode(errorMessage, ExceptionCode.InternalError);
        }
    }

    static internal string GetCacheKey(string token, string scopes, string clientId)
    {
        var parsedJwt = ParseJwt(token);
        var userObjectId = parsedJwt.Payload["oid"].ToString();
        var tenantId = parsedJwt.Payload["tid"].ToString();

        var key = string.Join("-",
            new string[] { "accessToken", userObjectId, clientId, tenantId, scopes }).Replace(' ', '_');
        return key;
    }

    static internal UserInfo GetUserInfoFromSsoToken(string ssoToken)
    {
        var tokenObject = ParseJwt(ssoToken);

        var userInfo = new UserInfo() {
            DisplayName = tokenObject.Payload["name"].ToString(),
            ObjectId = tokenObject.Payload["oid"].ToString(),
            PreferredUserName = "",
        };

        var version = tokenObject.Payload["ver"].ToString();

        if (version == "2.0")
        {
            userInfo.PreferredUserName = tokenObject.Payload["preferred_username"].ToString();
        }
        else if (version == "1.0")
        {
            userInfo.PreferredUserName = tokenObject.Payload["upn"].ToString();
        }
        return userInfo;
    }
}
