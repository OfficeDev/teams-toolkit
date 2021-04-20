// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
namespace Microsoft.TeamsFx.SimpleAuth
{
    public class ConfigurationName
    {
        public const string ClientId = "CLIENT_ID";
        public const string ClientSecret = "CLIENT_SECRET";
        public const string OAuthAuthority = "OAUTH_AUTHORITY";
        public const string AadMetadataAddress = "AAD_METADATA_ADDRESS";
        public const string IdentifierUri = "IDENTIFIER_URI";
        public const string AllowedAppIds = "ALLOWED_APP_IDS";
        public const string TabAppEndpoint = "TAB_APP_ENDPOINT";
    }

    public class JWTClaims
    {
        public const string IdType = "idtyp";
        public const string Version = "ver";
        public const string AZP = "azp";
        public const string AppId = "appid";
    }
    
    public class JWTIdentityScope
    {
        public const string AppIdentityValue = "app";
    }

    public enum JWTIdentityType 
    {
        UserIdentity,
        ApplicationIdentity
    }

    public class JWTVersion
    {
        public const string Ver1 = "1.0";
        public const string Ver2 = "2.0";
    }
}
