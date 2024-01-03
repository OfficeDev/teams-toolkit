# yaml-language-server: $schema=https://aka.ms/teams-toolkit/v1.3/yaml.schema.json
#
# The teamsapp.local.yml composes automation tasks for Teams Toolkit when running locally.
# This file is used when running Start Debugging (F5) from Visual Studio Code or with the TeamsFx CLI commands.
# i.e. `teamsfx provision --env local` or `teamsfx deploy --env local`.
#
# You can customize this file. Visit https://aka.ms/teamsfx-v5.0-guide for more info about Teams Toolkit project files.
version: v1.3

environmentFolderPath: ./env

# Defines what the `provision` lifecycle step does with Teams Toolkit.
# Runs first during Start Debugging (F5) or run manually using `teamsfx provision --env local`.
provision:

  # Automates the creation of a Teams app registration and saves the App ID to an environment file.
  - uses: teamsApp/create
    with:
      name: {{appName}}${{APP_NAME_SUFFIX}}
    writeToEnvironmentFile:
      teamsAppId: TEAMS_APP_ID

  # Automates the creation an Azure AD app registration which is required for a bot.
  # The Bot ID (AAD app client ID) and Bot Password (AAD app client secret) are saved to an environment file.
  - uses: botAadApp/create
    with:
      name: {{appName}}${{APP_NAME_SUFFIX}}
    writeToEnvironmentFile:
      botId: BOT_ID
      botPassword: SECRET_BOT_PASSWORD

  # Automates the creation and configuration of a Bot Framework registration which is required for a bot.
  # This configures the bot to use the Azure AD app registration created in the previous step.
  # Teams Toolkit automatically creates a local Dev Tunnel URL and updates BOT_ENDPOINT when debugging (F5).
  - uses: botFramework/create
    with:
      botId: ${{BOT_ID}}
      name: EchoBot
      messagingEndpoint: ${{BOT_ENDPOINT}}/api/messages
      description: ""
      channels:
        - name: msteams

  # Optional: Automates schema and error checking of the Teams app manifest and outputs the results in the console.
  - uses: teamsApp/validateManifest
    with:
      manifestPath: ./appPackage/manifest.json

  # Automates the creation of a Teams app package (.zip).
  - uses: teamsApp/zipAppPackage
    with:
      manifestPath: ./appPackage/manifest.json
      outputZipPath: ./appPackage/build/appPackage.${{TEAMSFX_ENV}}.zip
      outputJsonPath: ./appPackage/build/manifest.${{TEAMSFX_ENV}}.json

  # Automates updating the Teams app manifest in Teams Developer Portal using the App ID from the mainfest file.
  # This action ensures that any manifest changes are reflected when launching the app again in Teams.
  - uses: teamsApp/update
    with:
      # Relative path to this file. This is the path for built zip file.
      appPackagePath: ./appPackage/build/appPackage.${{TEAMSFX_ENV}}.zip

# Defines what the `deploy` lifecycle step does with Teams Toolkit.
# Runs after `provision` during Start Debugging (F5) or run manually using `teamsfx deploy --env local`.
deploy:
  # Run npm command
  - uses: cli/runNpmCommand
    name: install dependencies
    with:
      args: install --no-audit

  # Provides the Teams Toolkit .env file values to the apps runtime so they can be accessed with `process.env`.
  - uses: file/createOrUpdateEnvironmentFile
    with:
      target: ./.env
      envs:
        BOT_ID: ${{BOT_ID}}
        BOT_PASSWORD: ${{SECRET_BOT_PASSWORD}}
        AZURE_OPENAI_KEY: ${{SECRET_AZURE_OPENAI_KEY}}
        AZURE_OPENAI_ENDPOINT: ${{AZURE_OPENAI_ENDPOINT}}