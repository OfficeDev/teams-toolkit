# yaml-language-server: $schema=https://developer.microsoft.com/json-schemas/teams-toolkit/teamsapp-yaml/1.0.0/yaml.schema.json
# Visit https://aka.ms/teamsfx-v5.0-guide for details on this file
# Visit https://aka.ms/teamsfx-actions for details on actions
version: 1.0.0

provision:
  - uses: teamsApp/create # Creates a Teams app
    with:
      name: {{appName}}-${{TEAMSFX_ENV}} # Teams app name
    writeToEnvironmentFile: # Write the information of created resources into environment file for the specified environment variable(s).
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
        
  # Set TAB_DOMAIN and TAB_ENDPOINT for local launch
  - uses: script 
    with:
      run:
        echo "::set-teamsfx-env TAB_DOMAIN=localhost:53000";
        echo "::set-teamsfx-env TAB_ENDPOINT=https://localhost:53000";
  - uses: teamsApp/validateManifest # Validate using manifest schema
    with:
      manifestPath: ./appPackage/manifest.json # Path to manifest template
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

deploy:
  - uses: devTool/install # Install development tool(s)
    with:
      devCert:
        trust: true
    writeToEnvironmentFile: # Write the information of installed development tool(s) into environment file for the specified environment variable(s).
      sslCertFile: SSL_CRT_FILE
      sslKeyFile: SSL_KEY_FILE

  - uses: cli/runNpmCommand # Run npm command
    with:
      args: install --no-audit

  - uses: file/createOrUpdateEnvironmentFile # Generate runtime environment variables for tab
    with:
      target: ./tab/.localConfigs
      envs:
        BROWSER: none
        HTTPS: true
        PORT: 53000
        SSL_CRT_FILE: ${{SSL_CRT_FILE}}
        SSL_KEY_FILE: ${{SSL_KEY_FILE}}

  - uses: file/createOrUpdateEnvironmentFile # Generate runtime environment variables for bot
    with:
      target: ./bot/.localConfigs
      envs:
        BOT_ID: ${{BOT_ID}}
        BOT_PASSWORD: ${{SECRET_BOT_PASSWORD}}