@maxLength(20)
@minLength(4)
@description('Used to generate names for all resources in this file')
param resourceBaseName string

{{#useOpenAI}}
@secure()
param openAIKey string
{{/useOpenAI}}
{{#useAzureOpenAI}}
@secure()
param azureOpenAIKey string

@secure()
param azureOpenAIEndpoint string

@secure()
param azureOpenAIDeploymentName string
{{/useAzureOpenAI}}

param webAppSKU string

@maxLength(42)
param botDisplayName string

param serverfarmsName string = resourceBaseName
param webAppName string = resourceBaseName
param identityName string = resourceBaseName
param location string = resourceGroup().location
param aadAppClientId string
param aadAppTenantId string
param aadAppOauthAuthorityHost string
@secure()
param aadAppClientSecret string

resource identity 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-01-31' = {
  location: location
  name: identityName
}

// Compute resources for your Web App
resource serverfarm 'Microsoft.Web/serverfarms@2021-02-01' = {
  kind: 'app'
  location: location
  name: serverfarmsName
  sku: {
    name: webAppSKU
  }
}

// Web App that hosts your bot
resource webApp 'Microsoft.Web/sites@2021-02-01' = {
  kind: 'app'
  location: location
  name: webAppName
  properties: {
    serverFarmId: serverfarm.id
    httpsOnly: true
    siteConfig: {
      alwaysOn: true
      appSettings: [
        {
          name: 'WEBSITE_RUN_FROM_PACKAGE'
          value: '1' // Run Azure App Service from a package file
        }
        {
          name: 'WEBSITE_NODE_DEFAULT_VERSION'
          value: '~18' // Set NodeJS version to 18.x for your site
        }
        {
          name: 'RUNNING_ON_AZURE'
          value: '1'
        }
        {
          name: 'BOT_ID'
          value: identity.properties.clientId
        }
        {
          name: 'BOT_TENANT_ID'
          value: identity.properties.tenantId
        }
        {
          name: 'BOT_TYPE' 
          value: 'UserAssignedMsi'
        }
        {{#useOpenAI}}
        {
          name: 'OPENAI_API_KEY'
          value: openAIKey
        }
        {{/useOpenAI}}
        {{#useAzureOpenAI}}
        {
          name: 'AZURE_OPENAI_API_KEY'
          value: azureOpenAIKey
        }
        {
          name: 'AZURE_OPENAI_ENDPOINT'
          value: azureOpenAIEndpoint
        }
        {
          name: 'AZURE_OPENAI_DEPLOYMENT_NAME'
          value: azureOpenAIDeploymentName
        }
        {{/useAzureOpenAI}}
      ]
      ftpsState: 'FtpsOnly'
    }
  }
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: {
      '${identity.id}': {}
    }
  }
}

resource webAppSettings 'Microsoft.Web/sites/config@2021-02-01' = {
  name: '${webAppName}/appsettings'
  properties: {
    WEBSITE_NODE_DEFAULT_VERSION: '~18'
    WEBSITE_RUN_FROM_PACKAGE: '1'
    BOT_ID: identity.properties.clientId
    BOT_TENANT_ID: identity.properties.tenantId
    BOT_TYPE: 'UserAssignedMsi'
    BOT_DOMAIN: webApp.properties.defaultHostName
    AAD_APP_CLIENT_ID: aadAppClientId
    AAD_APP_CLIENT_SECRET: aadAppClientSecret
    AAD_APP_TENANT_ID: aadAppTenantId
    AAD_APP_OAUTH_AUTHORITY_HOST: aadAppOauthAuthorityHost
    {{#useOpenAI}}
    OPENAI_API_KEY: openAIKey
    {{/useOpenAI}}
    {{#useAzureOpenAI}}
    AZURE_OPENAI_API_KEY: azureOpenAIKey
    AZURE_OPENAI_ENDPOINT: azureOpenAIEndpoint
    AZURE_OPENAI_DEPLOYMENT_NAME: azureOpenAIDeploymentName
    {{/useAzureOpenAI}}
    RUNNING_ON_AZURE: '1'
  }
}

// Register your web service as a bot with the Bot Framework
module azureBotRegistration './botRegistration/azurebot.bicep' = {
  name: 'Azure-Bot-registration'
  params: {
    resourceBaseName: resourceBaseName
    identityClientId: identity.properties.clientId
    identityResourceId: identity.id
    identityTenantId: identity.properties.tenantId
    botAppDomain: webApp.properties.defaultHostName
    botDisplayName: botDisplayName
  }
}

// The output will be persisted in .env.{envName}. Visit https://aka.ms/teamsfx-actions/arm-deploy for more details.
output BOT_AZURE_APP_SERVICE_RESOURCE_ID string = webApp.id
output BOT_DOMAIN string = webApp.properties.defaultHostName
output BOT_ID string = identity.properties.clientId
output BOT_TENANT_ID string = identity.properties.tenantId
