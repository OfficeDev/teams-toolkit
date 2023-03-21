# Visit https://aka.ms/teamsfx-v5.0-guide for details on this file
# Visit https://aka.ms/teamsfx-actions for details on actions
version: 1.0.0

provision:
  - uses: aadApp/create # Creates a new AAD app to authenticate users if AAD_APP_CLIENT_ID environment variable is empty
    with:
      name: {%appName%}-aad # Note: when you run configure/aadApp, the AAD app name will be updated based on the definition of manifest. If you don't want to change the name, ensure the name in AAD manifest is same with the name defined here.
      generateClientSecret: true # If the value is false, the action will not generate client secret for you
    # Output: following environment variable will be persisted in current environment's .env file.
    # AAD_APP_CLIENT_ID: the client id of AAD app
    # AAD_APP_CLIENT_SECRET: the client secret of AAD app
    # AAD_APP_OBJECT_ID: the object id of AAD app
    # AAD_APP_TENANT_ID: the tenant id of AAD app
    # AAD_APP_OAUTH_AUTHORITY_HOST: the host of OAUTH authority of AAD app
    # AAD_APP_OAUTH_AUTHORITY: the OAUTH authority of AAD app

  - uses: teamsApp/create # Creates a Teams app
    with:
      name: {%appName%}-${{TEAMSFX_ENV}} # Teams app name
    # Output: following environment variable will be persisted in current environment's .env file.
    # TEAMS_APP_ID: the id of Teams app

  - uses: script # Set TAB_DOMAIN for local launch
    name: Set TAB_DOMAIN for local launch
    with:
      run: echo "::set-output TAB_DOMAIN=localhost:44302"
  - uses: script # Set TAB_ENDPOINT for local launch
    name: Set TAB_ENDPOINT for local launch
    with:
      run: echo "::set-output TAB_ENDPOINT=https://localhost:44302"

  - uses: file/createOrUpdateJsonFile # Generate runtime appsettings to JSON file
    with:
      target: ./appsettings.Development.json
      appsettings:
        TeamsFx:
          Authentication:
            ClientId: ${{AAD_APP_CLIENT_ID}}
            ClientSecret: ${{SECRET_AAD_APP_CLIENT_SECRET}}
            OAuthAuthority: ${{AAD_APP_OAUTH_AUTHORITY}}

  - uses: aadApp/update # Apply the AAD manifest to an existing AAD app. Will use the object id in manifest file to determine which AAD app to update.
    with:
      manifestPath: ./aad.manifest.json # Relative path to this file. Environment variables in manifest will be replaced before apply to AAD app
      outputFilePath : ./build/aad.manifest.${{TEAMSFX_ENV}}.json
  # Output: following environment variable will be persisted in current environment's .env file.
  # AAD_APP_ACCESS_AS_USER_PERMISSION_ID: the id of access_as_user permission which is used to enable SSO

  - uses: teamsApp/zipAppPackage # Build Teams app package with latest env value
    with:
      manifestPath: ./appPackage/manifest.json # Path to manifest template
      outputZipPath: ./build/appPackage/appPackage.${{TEAMSFX_ENV}}.zip
      outputJsonPath: ./build/appPackage/manifest.${{TEAMSFX_ENV}}.json
  - uses: teamsApp/update # Apply the Teams app manifest to an existing Teams app in Teams Developer Portal. Will use the app id in manifest file to determine which Teams app to update.
    with:
      appPackagePath: ./build/appPackage/appPackage.${{TEAMSFX_ENV}}.zip # Relative path to this file. This is the path for built zip file.
    # Output: following environment variable will be persisted in current environment's .env file.
    # TEAMS_APP_ID: the id of Teams app