// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

using System.Reflection;

namespace Microsoft.Azure.WebJobs.Extensions.TeamsFx
{
    public static class Constants
    {
        public static string AccessAsUserScope = "access_as_user";
        public static string JwtVersion1 = "1.0";
        public static string JwtVersion2 = "2.0";
        public static string BearerScheme = "Bearer";
        public static string IdtypApp = "app";
    }

    public static class JwtClaim
    {
        public static string Ver = "ver";
        public static string PreferredUserName = "preferred_username";
        public static string Upn = "upn";
        public static string Idtyp = "idtyp";
        public static string AppId = "appid";
        public static string Azp = "azp";
        public static string Exp = "exp";
    }

    public static class ConfigurationNames
    {
        public static string ClientId = "M365_CLIENT_ID";
        public static string ClientSecret = "M365_CLIENT_SECRET";
        public static string OAuthAuthorityHost = "M365_AUTHORITY_HOST";
        public static string TenantId = "M365_TENANT_ID";
        public static string AllowedAppIds= "ALLOWED_APP_IDS";
        public static string TokenRefreshBufferMinutes = "TOKEN_REFRESH_BUFFER_MINUTES";
    }

    public static class GlobalConfig
    {
        public static readonly string TeamsFxVersion = Assembly.GetExecutingAssembly().GetName().Version.ToString();
    }
}
