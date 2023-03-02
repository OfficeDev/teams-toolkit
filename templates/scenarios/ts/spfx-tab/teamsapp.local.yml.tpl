# Visit https://aka.ms/teamsfx-v5.0-guide for details on this file
# Visit https://aka.ms/teamsfx-actions for details on actions
version: 1.0.0

registerApp:
  - uses: teamsApp/create # Creates a Teams app
    with:
      name: {%appName%}-${{TEAMSFX_ENV}} # Teams app name
    # Output: following environment variable will be persisted in current environment's .env file.
    # TEAMS_APP_ID: the id of Teams app

configureApp:
  - uses: teamsApp/validate # This action is currently skipped, will be updated in the future version.
    with:
      manifestPath: ./appPackage/manifest.local.json # Path to manifest template

  - uses: teamsApp/zipAppPackage # Build Teams app package with latest env value
    with:
      manifestPath: ./appPackage/manifest.local.json # Path to manifest template
      outputZipPath: ./build/appPackage/appPackage.${{TEAMSFX_ENV}}.zip
      outputJsonPath: ./build/appPackage/manifest.${{TEAMSFX_ENV}}.json

  - uses: teamsApp/update # Apply the Teams app manifest to an existing Teams app in Teams Developer Portal. Will use the app id in manifest file to determine which Teams app to update.
    with:
      appPackagePath: ./build/appPackage/appPackage.${{TEAMSFX_ENV}}.zip # Relative path to this file. This is the path for built zip file.
    # Output: following environment variable will be persisted in current environment's .env file.
    # TEAMS_APP_ID: the id of Teams app

  - uses: m365Title/acquire # Upload your app to Outlook and the Microsoft 365 app
    with:
      appPackagePath: ./build/appPackage/appPackage.${{TEAMSFX_ENV}}.zip # Relative path to the built app package.
    # Output: following environment variable will be persisted in current environment's .env file.
    # M365_TITLE_ID: the id of M365 title
    # M365_APP_ID: the app id of M365 title

deploy:
  - uses: cli/runNpmCommand # Run npm command
    with:
      args: install --no-audit
      workingDirectory: ./src