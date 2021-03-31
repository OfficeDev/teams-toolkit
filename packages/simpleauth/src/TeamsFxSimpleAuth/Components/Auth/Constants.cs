namespace Microsoft.TeamsFxSimpleAuth.Components.Auth
{
    public class AadGrantType
    {
        public const string AuthorizationCode = "authorization_code";
        public const string code = "code";
        public const string ClientCredentials = "client_credentials";
        public const string Password = "password";
    }

    public class AadErrorType
    {
        public const string InvalidClient = "invalid_client";
        public const string InvalidRequest = "invalid_request";
        public const string InteractionRequired = "interaction_required";
    }
}
