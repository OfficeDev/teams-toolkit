# yaml-language-server: $schema=https://aka.ms/teams-toolkit/v1.5/yaml.schema.json
# Visit https://aka.ms/teamsfx-v5.0-guide for details on this file
# Visit https://aka.ms/teamsfx-actions for details on actions
version: v1.5

environmentFolderPath: ./env

# Triggered when 'teamsapp provision' is executed
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

  # Creates a Teams app
  - uses: teamsApp/create
    with:
      # Teams app name
      name: {{appName}}${{APP_NAME_SUFFIX}}
    # Write the information of created resources into environment file for
    # the specified environment variable(s).
    writeToEnvironmentFile:
      teamsAppId: TEAMS_APP_ID

  - uses: arm/deploy # Deploy given ARM templates parallelly.
    with:
      # AZURE_SUBSCRIPTION_ID is a built-in environment variable,
      # if its value is empty, TeamsFx will prompt you to select a subscription.
      # Referencing other environment variables with empty values
      # will skip the subscription selection prompt.
      subscriptionId: ${{AZURE_SUBSCRIPTION_ID}}
      # AZURE_RESOURCE_GROUP_NAME is a built-in environment variable,
      # if its value is empty, TeamsFx will prompt you to select or create one
      # resource group.
      # Referencing other environment variables with empty values
      # will skip the resource group selection prompt.
      resourceGroupName: ${{AZURE_RESOURCE_GROUP_NAME}}
      templates:
        - path: ./infra/azure.bicep # Relative path to this file
          # Relative path to this yaml file.
          # Placeholders will be replaced with corresponding environment
          # variable before ARM deployment.
          parameters: ./infra/azure.parameters.json
          # Required when deploying ARM template
          deploymentName: Create-resources-for-bot
      # Teams Toolkit will download this bicep CLI version from github for you,
      # will use bicep CLI in PATH if you remove this config.
      bicepCliVersion: v0.9.1

  - uses: aadApp/update # Apply the AAD manifest to an existing AAD app. Will use the object id in manifest file to determine which AAD app to update.
    with:
      manifestPath: ./aad.manifest.json # Relative path to teamsfx folder. Environment variables in manifest will be replaced before apply to AAD app
      outputFilePath: ./build/aad.manifest.${{TEAMSFX_ENV}}.json

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

# Triggered when 'teamsapp deploy' is executed
deploy:
  # Run npm command
  - uses: cli/runNpmCommand
    name: install dependencies
    with:
      args: install
  - uses: cli/runNpmCommand
    name: build app
    with:
      args: run build --if-present
  # Deploy your application to Azure App Service using the zip deploy feature.
  # For additional details, refer to https://aka.ms/zip-deploy-to-app-services.
  - uses: azureAppService/zipDeploy
    with:
      # Deploy base folder
      artifactFolder: .
      # Ignore file location, leave blank will ignore nothing
      ignoreFile: .webappignore
      # The resource id of the cloud resource to be deployed to.
      # This key will be generated by arm/deploy action automatically.
      # You can replace it with your existing Azure Resource id
      # or add it to your environment variable file.
      resourceId: ${{BOT_AZURE_APP_SERVICE_RESOURCE_ID}}

# Triggered when 'teamsapp publish' is executed
publish:
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
  # Publish the app to
  # Teams Admin Center (https://admin.teams.microsoft.com/policies/manage-apps)
  # for review and approval
  - uses: teamsApp/publishAppPackage
    with:
      appPackagePath: ./appPackage/build/appPackage.${{TEAMSFX_ENV}}.zip
    # Write the information of created resources into environment file for
    # the specified environment variable(s).
    writeToEnvironmentFile:
      publishedAppId: TEAMS_APP_PUBLISHED_APP_ID
