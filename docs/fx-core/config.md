## Configuration schema for bot
This section is to describe configuration items in `fx-resource-bot` section of `.fx/env.default.json`.

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