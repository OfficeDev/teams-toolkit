## Overview

`.fx/states/state.{envName}.json` file has the following schema:

```
{
    "solution": {
        ...
    },
    "fx-resource-local-debug": {
        ...
    },
    "fx-resource-frontend-hosting": {
      ...
    },
    "fx-resource-azure-sql": {
      ...
    },
    "fx-resource-identity": {
      ...
    },
    "fx-resource-function": {
        ...
    },
    "fx-resource-aad-app-for-teams": {
      ...
    },
    "fx-resource-simple-auth": {
      ...
    },
    "fx-resource-bot": {
        ...
    }
}
```

We will describe the configuration schema for each section.

## Configuration schema for solution
This section is to describe configuration items in `solution` section of `.fx/states/state.{envName}.json`.

Config Name | Config Type | Description
------|------|------
resourceNameSuffix|string|used by resources to make resouce names unique across each provision
resourceGroupName|string|azure resource group name
tenantId|string|azure tenant id
subscriptionId|string|azure subscription id
teamsAppTenantId|string|Teams App tenant id
location|string|Azure |Resource Location, e.g. EAST US
localDebugTeamsAppId|string|Local Debug Teams App Id
programmingLanguage|string|javascript |  typescript | csharp
permissionRequest|string|the file content of permission.json file in root folder


## Configuration schema for bot
This section is to describe configuration items in `fx-resource-bot` section of `.fx/states/state.{envName}.json`.

Config Name | Config Type | Description
------|------|------
wayToRegisterBot|string|The way to register bot, one is `create-new`, the other is `reuse-existing`.
skuName|string|The sku name for Azure Web App which is used for hosting the bot project on Azure. For example, F1, B1. For more options, refer to [App Service Pricing](https://azure.microsoft.com/en-us/pricing/details/app-service/windows/).
localBotId|string|The AAD App client id generated during local debug which is paired with localBotPassword to provide authentication between the bot project and the bot framework service.
localBotPassword|string|The AAD App client secret generated during local debug which is paired with localBotId to provide authentication between the bot project and the bot framework service.
localObjectId|string|The AAD App object id generated during local debug which is co-related with localBotId and localBotPassword.
siteName|string|The site name for Azure Web App which is used for hosting the bot project on Azure.
siteEndpoint|string|The site endpoint for Azure Web App which is used for hosting the bot project on Azure.
validDomain|string|The valid domain item for Azure Web App which is used for hosting the bot project on Azure. Refer to [Teams Manifest Schema's validDomains](https://docs.microsoft.com/en-us/microsoftteams/platform/resources/schema/manifest-schema#validdomains).;
botId|string|The AAD App client id generated during provision which is paired with botPassword to provide authentication between the bot project and the bot framework service.
botPassword|string|The AAD App client secret generated during provision which is paired with botId to provide authentication between the bot project and the bot framework service.
objectId|string|The AAD App object id generated during provision which is co-related with botId and botPassword.
appServicePlan|string|The Azure App Service Plan name for the Azure Web App which is used for hosting the bot project on Azure.
botChannelReg|string|The Azure Bot Channels Registration name for bot registration.

## Configuration schema for MS identity
This section is to describe configuration items in `fx-resource-identity` section of `.fx/states/state.{envName}.json`.

Config Name | Config Type | Description
------|------|------
identityName|string|Identity present name end user input/
identityResourceId|string|Full path resource name. '/subscriptions/${subscriptionId}/resourcegroups/${resourceGroup}/providers/Microsoft.ManagedIdentity/userAssignedIdentities/${identity}'
identityClientId|string|Client Id of the identity.

## Configuration schema for frontend hosting

This section is to describe configuration items in `fx-resource-frontend-hosting` section of `.fx/states/state.{envName}.json`.

Config Name | Config Type | Description
------|------|------
endpoint|string|Output. The endpoint of static website. https://domain.com 
domain|string|Output. The domain of static website. domain.com
storageName|string|Output. The name of the Azure Storage Account where static website is hosted.
staticTabs|string|Output. The value of staticTabs field in manifest.json
configurableTabs|string|Output. The value of configurableTabs field in manifest.json

## Configuration schema for Azure SQL

This section is to describe configuration items in `fx-resource-azure-sql` section of `.fx/states/state.{envName}.json`.

Config Name | Config Type | Description
------|------|------
sqlEndpoint|string|The sql server endpoint.  '${sqlServer}.database.windows.net'
databaseName|string|The created database name

## Configuration schema for Azure Functions

This section is to describe configuration items in `fx-resource-function` section of `.fx/states/state.{envName}.json`.

Config Name | Config Type | Description
------|------|------
defaultFunctionName|string|The default function name scaffolded
functionAppName|string|Output. The function app name.
functionEndpoint|string|Output. The function app endpoint. `https://${functionAppName}.azurewebsites.net`
storageAccountName|string|Output. The name of the Azure Storage Account used by the function app.
appServicePlanName|string|Output. The name of the Azure App Service Plan used by the function app.

## Configuration schema for simple auth

This section is to describe configuration items in `fx-resource-simple-auth` section of `.fx/states/state.{envName}.json`.

Config Name | Config Type | Description
------|------|------
filePath|string|Output. The zip file path of Runtime Connector in local computer. `E:\FooBar\runtimeConnector\resources\TeamsRuntimeConnector.zip`
environmentVariableParams|string|Output. CLI parameters of environment variable. `CLIENT_ID="aaa" clientSecret="123"`
endpoint|string|Output. The endpoint of Runtime Connector. https://domain.com 


## Configuration schema for Azure Active Directory

This section is to describe configuration items in `fx-resource-aad-app-for-teams` section of `.fx/states/state.{envName}.json`.

Config Name | Config Type | Description
------|------|------
clientId / local_clientId|string|Output. The client id of aad app.
objectId / local_objectId|string|Ouptut. The object id of aad app.
clientSecret / local_clientSecret|string|Output. The client secret of aad app.
oauth2PermissionScopeId / local_oauth2PermissionScopeId|string|Output. The scope Id of oauth 2Permisson.
applicationIdUris / local_applicationIdUris|string|Output. Application id uri of the aad app.
teamsMobileDesktopAppId|string|Output. App id for teams mobile desktop.
teamsWebAppId|string|Output. App id for teams web.
oauthAuthority|string|Output. Oauth authority. 'https://login.microsoftonline.com/tenantId'
oauthHost|string|Output. Oauth authority host. 'https://login.microsoftonline.com/'
tenantId / local_tenantId|string|Ouptut. The tenant id of aad app.


## Configuration schema for API Management

This section is to describe configuration items in `fx-resource-apim` section of `.fx/states/state.{envName}.json`.

Config Name | Config Type | Description
------|------|------
clientid|string|The client id of backend client aad.


## Configuration schema for local debug

This section is to describe configuration items in `fx-resource-local-debug` section of `.fx/env.default.json`.

Config Name | Config Type | Description
------|------|------
trustDevCert|string|Whether to trust the development certificate. `true` or `false`
skipNgrok|string|Whether to skip Ngrok. `true` or `false`
localAuthEndpoint|string|Output. The endpoint of local auth service. `http://localhost:{port}`
localTabEndpoint|string|Output. The endpoint of local tab frontend. `https://localhost:{port}`
localTabDomain|string|Output. The domain of local tab frontend. `localhost:3000`
localFunctionEndpoint|string|Output. The endpoint of local function. `http://localhost:{port}`
localBotEndpoint|string|Output. The endpoint of local bot service. `https://{random}.ngrok.io`
localBotDomain|string|Output. The domain of local bot service. `{random}.ngrok.io`


