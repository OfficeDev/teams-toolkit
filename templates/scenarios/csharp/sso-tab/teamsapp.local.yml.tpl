# yaml-language-server: $schema=https://developer.microsoft.com/json-schemas/teams-toolkit/teamsapp-yaml/1.0.0/yaml.schema.json
# Visit https://aka.ms/teamsfx-v5.0-guide for details on this file
# Visit https://aka.ms/teamsfx-actions for details on actions
version: 1.0.0

provision:
  - uses: aadApp/create # Creates a new Azure Active Directory (AAD) app to authenticate users if the environment variable that stores clientId is empty
    with:
      name: {{appName}}-aad # Note: when you run aadApp/update, the AAD app name will be updated based on the definition in manifest. If you don't want to change the name, make sure the name in AAD manifest is the same with the name defined here.
      generateClientSecret: true # If the value is false, the action will not generate client secret for you
      signInAudience: "AzureADMyOrg" # Authenticate users with a Microsoft work or school account in your organization's Azure AD tenant (for example, single tenant).
      writeToEnvironmentFile: # Write the information of created resources into environment file for the specified environment variable(s).
      clientId: AAD_APP_CLIENT_ID
      clientSecret: SECRET_AAD_APP_CLIENT_SECRET # Environment variable that starts with `SECRET_` will be stored to the .env.{envName}.user environment file
      objectId: AAD_APP_OBJECT_ID
      tenantId: AAD_APP_TENANT_ID
      authority: AAD_APP_OAUTH_AUTHORITY
      authorityHost: AAD_APP_OAUTH_AUTHORITY_HOST

  - uses: teamsApp/create # Creates a Teams app
    with:
      name: {{appName}}-${{TEAMSFX_ENV}} # Teams app name
    writeToEnvironmentFile: # Write the information of created resources into environment file for the specified environment variable(s).
      teamsAppId: TEAMS_APP_ID

  - uses: script # Set TAB_DOMAIN for local launch
    name: Set TAB_DOMAIN for local launch
    with:
      run: echo "::set-teamsfx-env TAB_DOMAIN=localhost:44302"
  - uses: script # Set TAB_ENDPOINT for local launch
    name: Set TAB_ENDPOINT for local launch
    with:
      run: echo "::set-teamsfx-env TAB_ENDPOINT=https://localhost:44302"

  - uses: file/createOrUpdateJsonFile # Generate runtime appsettings to JSON file
    with:
      target: ./appsettings.Development.json
      appsettings:
        TeamsFx:
          Authentication:
            ClientId: ${{AAD_APP_CLIENT_ID}}
            ClientSecret: ${{SECRET_AAD_APP_CLIENT_SECRET}}
            InitiateLoginEndpoint: ${{TAB_ENDPOINT}}/auth-start.html
            OAuthAuthority: ${{AAD_APP_OAUTH_AUTHORITY}}

  - uses: aadApp/update # Apply the AAD manifest to an existing AAD app. Will use the object id in manifest file to determine which AAD app to update.
    with:
      manifestPath: ./aad.manifest.json # Relative path to this file. Environment variables in manifest will be replaced before apply to AAD app
      outputFilePath : ./build/aad.manifest.${{TEAMSFX_ENV}}.json

  - uses: teamsApp/zipAppPackage # Build Teams app package with latest env value
    with:
      manifestPath: ./appPackage/manifest.json # Path to manifest template
      outputZipPath: ./appPackage/build/appPackage.${{TEAMSFX_ENV}}.zip
      outputJsonPath: ./appPackage/build/manifest.${{TEAMSFX_ENV}}.json
  - uses: teamsApp/validateAppPackage # Validate app package using validation rules
    with:
      appPackagePath: ./appPackage/build/appPackage.${{TEAMSFX_ENV}}.zip # Relative path to this file. This is the path for built zip file.
  - uses: teamsApp/update # Apply the Teams app manifest to an existing Teams app in Teams Developer Portal. Will use the app id in manifest file to determine which Teams app to update.
    with:
      appPackagePath: ./appPackage/build/appPackage.${{TEAMSFX_ENV}}.zip # Relative path to this file. This is the path for built zip file.