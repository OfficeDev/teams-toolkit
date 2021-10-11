// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

using System;

namespace Microsoft.TeamsFx.Model
{
    internal class SimpleAuthError
    {
        public string type;

        public string message;
    }

    internal class SimpleAuthAccessToken
    {
        public string scope;

        public DateTimeOffset expires_on;

        public string access_token;
    }

    internal class AuthCode
    {
        public string code;

        public string codeVerifier;

        public string redirectUri;
    }

    internal class GrantType
    {
        public static string AuthCode = "authorization_code";

        public static string SsoToken = "sso_token";
    }
}
