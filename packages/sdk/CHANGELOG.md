# 0.5.0
- Breaking: TeamsUserCredential now will use Auth Code Flow with PKCE for SPA authentication. You can find more detail here: https://aka.ms/teamsfx-auth-code-flow.
- Support multiple SQL database connection
- Fix TeamsBotSsoPrompt runtime error

# 0.4.1
- Move "@microsoft/teams-js" to peer dependency

# 0.3.0
- Support certificate-based authentication for TeamsFx SDK

# 0.0.5

- Read SQL database name from `SQL_DATABASE_NAME` environment variable
- Add more error types for credential classes

# 0.0.4

Initial alpha release of the SDK. Following features are included:

- Credentials to simplify Team app authentication with Teams SSO support
- Simplify authentication to Microsoft Graph APIs
- TeamsBotSsoPrompt to support Teams Bot development with SSO
- DefaultTediousConnectionConfiguration to connect to MSSQL database
