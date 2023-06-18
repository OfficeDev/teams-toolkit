# yaml-language-server: $schema=https://aka.ms/teams-toolkit/1.0.0/yaml.schema.json
version: 1.0.0

environmentFolderPath: ./env

provision:
  - uses: aadApp/create # Creates a new Azure Active Directory (AAD) app to authenticate users if the environment variable that stores clientId is empty
    with:
      name: {{appName}}-aad # Note: when you run aadApp/update, the AAD app name will be updated based on the definition in manifest. If you don't want to change the name, make sure the name in AAD manifest is the same with the name defined here.
      generateClientSecret: true # If the value is false, the action will not generate client secret for you
      signInAudience: "AzureADMyOrg" # Authenticate users with a Microsoft work or school account in your organization's Azure AD tenant (for example, single tenant).
    writeToEnvironmentFile:
      # Write the information of created resources into environment file for the specified environment variable(s).
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
      name: {{appName}}-${{TEAMSFX_ENV}}
    # Write the information of created resources into environment file for
    # the specified environment variable(s).
    writeToEnvironmentFile:
      teamsAppId: TEAMS_APP_ID

  - uses: arm/deploy # Deploy given ARM templates parallelly.
    with:
      subscriptionId: ${{AZURE_SUBSCRIPTION_ID}} # The AZURE_SUBSCRIPTION_ID is a built-in environment variable. TeamsFx will ask you select one subscription if its value is empty. You're free to reference other environment varialbe here, but TeamsFx will not ask you to select subscription if it's empty in this case.
      resourceGroupName: ${{AZURE_RESOURCE_GROUP_NAME}} # The AZURE_RESOURCE_GROUP_NAME is a built-in environment variable. TeamsFx will ask you to select or create one resource group if its value is empty. You're free to reference other environment varialbe here, but TeamsFx will not ask you to select or create resource grouop if it's empty in this case.
      templates:
        - path: infra/azure.bicep # Relative path to teamsfx folder
          parameters: infra/azure.parameters.json # Relative path to teamsfx folder. Placeholders will be replaced with corresponding environment variable before ARM deployment.
          deploymentName: Create-resources-for-tab # Required when deploy ARM template
      bicepCliVersion: v0.9.1 # Teams Toolkit will download this bicep CLI version from github for you, will use bicep CLI in PATH if you remove this config.

  - uses: azureStorage/enableStaticWebsite
    with:
      storageResourceId: ${{TAB_AZURE_STORAGE_RESOURCE_ID}}
      indexPage: index.html
      errorPage: error.html

  - uses: aadApp/update # Apply the AAD manifest to an existing AAD app. Will use the object id in manifest file to determine which AAD app to update.
    with:
      manifestPath: aad.manifest.json # Relative path to teamsfx folder. Environment variables in manifest will be replaced before apply to AAD app
      outputFilePath: build/aad.manifest.${{TEAMSFX_ENV}}.json

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
  # Apply the Teams app manifest to an existing Teams app in
  # Teams Developer Portal.
  # Will use the app id in manifest file to determine which Teams app to update.
  - uses: teamsApp/update
    with:
      appPackagePath: ./appPackage/build/appPackage.${{TEAMSFX_ENV}}.zip # Relative path to teamsfx folder. This is the path for built zip file.

deploy:
  # Run npm command
  - uses: cli/runNpmCommand
    with:
      args: install
  # Run npm command
  - uses: cli/runNpmCommand
    env:
      REACT_APP_CLIENT_ID: ${{AAD_APP_CLIENT_ID}}
      REACT_APP_START_LOGIN_PAGE_URL: ${{TAB_ENDPOINT}}/auth-start.html
      REACT_APP_FUNC_NAME: getUserProfile
      REACT_APP_FUNC_ENDPOINT: ${{API_FUNCTION_ENDPOINT}}
    with:
      args: run build --if-present
  # Deploy bits to Azure Storage Static Website
  - uses: azureStorage/deploy
    with:
      # Deploy base folder. This folder includes manifest files for AAD app and Teams app that should be ignored using the ignoreFile.
      artifactFolder: build
      # The resource id of the cloud resource to be deployed to
      resourceId: ${{TAB_AZURE_STORAGE_RESOURCE_ID}}
  # Run npm command
  - uses: cli/runNpmCommand
    with:
      workingDirectory: api
      args: install
  # Run npm command
  - uses: cli/runNpmCommand
    with:
      workingDirectory: api
      args: run build --if-present
  # Install development tool(s)
  - uses: devTool/install
    with:
      dotnet: true
    # Write the information of installed development tool(s) into environment
    # file for the specified environment variable(s).
    writeToEnvironmentFile:
      dotnetPath: DOTNET_PATH
  - uses: cli/runDotnetCommand
    with:
      workingDirectory: api
      args: build extensions.csproj -o bin --ignore-failed-sources
      execPath: ${{DOTNET_PATH}}
  # Deploy your application to Azure Functions using the zip deploy feature.
  # For additional details, see at https://aka.ms/zip-deploy-to-azure-functions
  - uses: azureFunctions/zipDeploy
    with:
      workingDirectory: api
      # deploy base folder
      artifactFolder: .
      # Ignore file location, leave blank will ignore nothing
      ignoreFile: .funcignore
      # the resource id of the cloud resource to be deployed to
      resourceId: ${{API_FUNCTION_RESOURCE_ID}}

publish:
  # Validate using manifest schema
  - uses: teamsApp/validateManifest
    with:
      # Path to manifest template
      manifestPath: ./appPackage/manifest.json
  - uses: teamsApp/zipAppPackage
    with:
      # Path to manifest template
      manifestPath: ./appPackage/manifest.json
      outputZipPath: ./appPackage/build/appPackage.${{TEAMSFX_ENV}}.zip
      outputJsonPath: ./appPackage/build/manifest.${{TEAMSFX_ENV}}.json
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
projectId: 5b64ce06-3dc5-4f27-838c-9bafc3586b07
