# yaml-language-server: $schema=https://developer.microsoft.com/json-schemas/teams-toolkit/teamsapp-yaml/1.0.0/yaml.schema.json
# Visit https://aka.ms/teamsfx-v5.0-guide for details on this file
# Visit https://aka.ms/teamsfx-actions for details on actions
version: 1.0.0

provision:
  # Creates a new Azure Active Directory (AAD) app to authenticate users if
  # the environment variable that stores clientId is empty
  - uses: aadApp/create
    with:
      # Note: when you run aadApp/update, the AAD app name will be updated
      # based on the definition in manifest. If you don't want to change the
      # name, make sure the name in AAD manifest is the same with the name
      # defined here.
      name: {{appName}}-aad
      # If the value is false, the action will not generate client secret for you
      generateClientSecret: true
      # Authenticate users with a Microsoft work or school account in your
      # organization's Azure AD tenant (for example, single tenant).
      signInAudience: AzureADMyOrg
    # Write the information of created resources into environment file for the
    # specified environment variable(s).
    writeToEnvironmentFile:
      clientId: AAD_APP_CLIENT_ID
      # Environment variable that starts with `SECRET_` will be stored to the
      # .env.{envName}.user environment file
      clientSecret: SECRET_AAD_APP_CLIENT_SECRET
      objectId: AAD_APP_OBJECT_ID
      tenantId: AAD_APP_TENANT_ID
      authority: AAD_APP_OAUTH_AUTHORITY
      authorityHost: AAD_APP_OAUTH_AUTHORITY_HOST

  # Creates a Teams app
  - uses: teamsApp/create
    with:
      # Teams app name
      name: {{appName}}-${{TEAMSFX_ENV}}
    # Write the information of created resources into environment file for
    # the specified environment variable(s).
    writeToEnvironmentFile: 
      teamsAppId: TEAMS_APP_ID
  
  # Set TAB_DOMAIN and TAB_ENDPOINT for local launch
  - uses: script
    with:
      run:
        echo "::set-teamsfx-env TAB_DOMAIN=localhost:44302";
        echo "::set-teamsfx-env TAB_ENDPOINT=https://localhost:44302";

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

  # Apply the AAD manifest to an existing AAD app. Will use the object id in
  # manifest file to determine which AAD app to update.
  - uses: aadApp/update
    with:
      # Relative path to this file. Environment variables in manifest will
      # be replaced before apply to AAD app
      manifestPath: ./aad.manifest.json
      outputFilePath : ./build/aad.manifest.${{TEAMSFX_ENV}}.json

  # Validate using manifest schema
  - uses: teamsApp/validateManifest
    with:
      # Path to manifest template
      manifestPath: ./appPackage/manifest.json
  # Build Teams app package with latest env value
  - uses: teamsApp/zipAppPackage
    with:
      # Path to manifest template
      manifestPath: ./appPackage/manifest.json
      outputZipPath: ./appPackage/build/appPackage.${{TEAMSFX_ENV}}.zip
      outputJsonPath: ./appPackage/build/manifest.${{TEAMSFX_ENV}}.json
  # Validate app package using validation rules
  - uses: teamsApp/validateAppPackage
    with:
      # Relative path to this file. This is the path for built zip file.
      appPackagePath: ./appPackage/build/appPackage.${{TEAMSFX_ENV}}.zip
  # Apply the Teams app manifest to an existing Teams app in
  # Teams Developer Portal.
  # Will use the app id in manifest file to determine which Teams app to update.
  - uses: teamsApp/update
    with:
      # Relative path to this file. This is the path for built zip file.
      appPackagePath: ./appPackage/build/appPackage.${{TEAMSFX_ENV}}.zip