# Visit https://aka.ms/teamsfx-v5.0-guide for details on this file
# Visit https://aka.ms/teamsfx-actions for details on actions
version: 1.0.0

provision:
  - uses: teamsApp/create # Creates a Teams app
    with:
      name: {{appName}}-${{TEAMSFX_ENV}} # Teams app name
    writeToEnvironmentFile: # Write the information of installed dependencies into environment file for the specified environment variable(s).
      teamsAppId: TEAMS_APP_ID

  - uses: botAadApp/create # Creates a new or reuses an existing Azure Active Directory application for bot.
    with:
      name: {{appName}}-${{TEAMSFX_ENV}} # The Azure Active Directory application's display name
    writeToEnvironmentFile:
      botId: BOT_ID # The Azure Active Directory application's client id created for bot.
      botPassword: SECRET_BOT_PASSWORD # The Azure Active Directory application's client secret created for bot. 

  - uses: botFramework/create # Create or update the bot registration on dev.botframework.com
    with:
      botId: ${{BOT_ID}}
      name: {{appName}}
      messagingEndpoint: ${{BOT_ENDPOINT}}/api/messages
      description: ""
      channels:
        - name: msteams

  - uses: teamsApp/validateManifest # Validate using manifest schema
    with:
      manifestPath: ./appPackage/manifest.json # Path to manifest template

  - uses: teamsApp/zipAppPackage # Build Teams app package with latest env value
    with:
      manifestPath: ./appPackage/manifest.json # Path to manifest template
      outputZipPath: ./build/appPackage/appPackage.${{TEAMSFX_ENV}}.zip
      outputJsonPath: ./build/appPackage/manifest.${{TEAMSFX_ENV}}.json

  - uses: teamsApp/update # Apply the Teams app manifest to an existing Teams app in Teams Developer Portal. Will use the app id in manifest file to determine which Teams app to update.
    with:
      appPackagePath: ./build/appPackage/appPackage.${{TEAMSFX_ENV}}.zip # Relative path to this file. This is the path for built zip file.
    writeToEnvironmentFile: # Write the information of installed dependencies into environment file for the specified environment variable(s).
      teamsAppId: TEAMS_APP_ID

deploy:
  - uses: cli/runNpmCommand # Run npm command
    with:
      args: install --no-audit

  - uses: file/createOrUpdateEnvironmentFile # Generate runtime environment variables
    with:
      target: ./.localSettings
      envs:
        BOT_ID: ${{BOT_ID}}
        BOT_PASSWORD: ${{SECRET_BOT_PASSWORD}}