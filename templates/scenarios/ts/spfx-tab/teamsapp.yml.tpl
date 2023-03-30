# Visit https://aka.ms/teamsfx-v5.0-guide for details on this file
# Visit https://aka.ms/teamsfx-actions for details on actions
version: 1.0.0

environmentFolderPath: ./env

# Triggered when 'teamsfx deploy' is executed
deploy:
  - uses: cli/runNpmCommand
    with:
      args: install
      workingDirectory: ./src
  - uses: cli/runNpxCommand
    with:
      workingDirectory: ./src
      args: gulp bundle --ship --no-color
  - uses: cli/runNpxCommand
    with:
      workingDirectory: ./src
      args: gulp package-solution --ship --no-color
  - uses: spfx/deploy
    with:
      createAppCatalogIfNotExist: false
      packageSolutionPath: ./src/config/package-solution.json


# Triggered when 'teamsfx provision' is executed
provision:
  - uses: teamsApp/create # Creates a Teams app
    with:
      name: {{appName}}-${{TEAMSFX_ENV}} # Teams app name
    writeToEnvironmentFile: # Write the information of installed dependencies into environment file for the specified environment variable(s).
      teamsAppId: TEAMS_APP_ID

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
      manifestTemplate: ./appPackage/manifest.json # Relative path to this file. Environment variables in manifest will be replaced before apply to Teams app
    writeToEnvironmentFile: # Write the information of installed dependencies into environment file for the specified environment variable(s).
      teamsAppId: TEAMS_APP_ID
  - uses: m365Title/acquire # Upload your app to Outlook and the Microsoft 365 app
    with:
      appPackagePath: ./build/appPackage/appPackage.${{TEAMSFX_ENV}}.zip # Relative path to the built app package.
    writeToEnvironmentFile: # Write the information of created resources into environment file for the specified environment variable(s).
      titleId: M365_TITLE_ID
      appId: M365_APP_ID

# Triggered when 'teamsfx publish' is executed
publish:
  - uses: teamsApp/validateManifest # Validate using manifest schema
    with:
      manifestPath: ./appPackage/manifest.json # Path to manifest template
  - uses: teamsApp/zipAppPackage
    with:
      manifestPath: ./appPackage/manifest.json # Path to manifest template
      outputZipPath: ./build/appPackage/appPackage.${{TEAMSFX_ENV}}.zip
      outputJsonPath: ./build/manifest.${{TEAMSFX_ENV}}.json
  - uses: teamsApp/copyAppPackageToSPFx
    with:
      appPackagePath: ./build/appPackage/appPackage.${{TEAMSFX_ENV}}.zip
      spfxFolder: ./src
  - uses: teamsApp/update # Apply the Teams app manifest to an existing Teams app in Teams Developer Portal. Will use the app id in manifest file to determine which Teams app to update.
    with:
      appPackagePath: ./build/appPackage/appPackage.${{TEAMSFX_ENV}}.zip # Relative path to this file. This is the path for built zip file.
    writeToEnvironmentFile: # Write the information of installed dependencies into environment file for the specified environment variable(s).
      teamsAppId: TEAMS_APP_ID
  - uses: teamsApp/publishAppPackage # Publish the app to Teams Admin Center (https://admin.teams.microsoft.com/policies/manage-apps) for review and approval
    with:
      appPackagePath: ./build/appPackage/appPackage.${{TEAMSFX_ENV}}.zip
    writeToEnvironmentFile: # Write the information of installed dependencies into environment file for the specified environment variable(s).
      publishedAppId: TEAMS_APP_PUBLISHED_APP_ID