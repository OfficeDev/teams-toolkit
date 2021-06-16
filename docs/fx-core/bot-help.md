## BT.FreeServerFarmsQuotaError

### Error Message

The maximum number of Free App Service Plan allowed in a Subscription is 10.

### Mitigation

There are two methods to mitigate this issue:

#### Method #1
1. Delete other Free App Service Plan. Just go to [Azure Portal](https://portal.azure.com/), find some useless Free App Service Plans and delete them. To quickly filter Free App Service Plan, use Azure Cli Command: `az appservice plan list --query "[?sku.tier=='Free']"`. 
2. Run `Provision` command again.


#### Method #2
1. Open `.fx\env.default.json` file.
2. Set value of 'skuName' config of 'fx-resource-bot' to, for example, B1.
3. Run `Provision` command again.

## BT.MissingSubscriptionRegistrationError

### Eror Message

The subscription didn't register to use namespace 'Microsoft.BotService'.

### Mitigation

Please refer to this [link](https://aka.ms/rps-not-found) to register your subscription to use namespace 'Microsoft.BotService'.

## How to reuse existing bot registration in Toolkit v2?

Suppose an existing bot has been registered by [azure bot channel registration](https://docs.microsoft.com/en-us/azure/bot-service/bot-service-quickstart-registration?view=azure-bot-service-4.0) or [bot framework's legacy portal](https://dev.botframework.com/bots/new), you can follow this guide to reuse the existing bot registration in Toolkit v2.

No matter registering bot by azure bot channel registration or bot framework's legacy portal, a pair of bot id and bot password will be generated. please copy/paste them after choosing reusing existing bot in Toolkit v2.

### Pay attention!!!
Don't forget to add microsoft teams as a featured channel when registering bot on azure.
![image](../images/fx-core/bot/dont-forget-add-teams-channel.png)

### Choose `using an existing bot registration`.
![image](../images/fx-core/bot/way-to-register-bot.png)

### Enter bot id.
![image](../images/fx-core/bot/enter-bot-id.png)

### Enter bot password.
![image](../images/fx-core/bot/enter-bot-password.png)

### Record the message endpoint generated during provision.
Toolkit v2 will pop-up a dialog to show the target message endpoint for bot. Users should use this message endpoint to do the updating.
![image](../images/fx-core/bot/pop-up-message-endpoint.png)

### Update message endpoint.
#### if registering bot by legacy portal:
1. Choose your bot registration on [legacy portal](https://dev.botframework.com/bots) under `My bots`.
![image](../images/fx-core/bot/choose-under-mybots.png)
2. Scroll down to find `Messaging endpoint` under `Configuration`.
![image](../images/fx-core/bot/scroll-down-settings.png)
3. Paste the target message endpoint in text box `Messaging endpoint`

#### if registering bot by auzre bot channel registration:
1. Choose your bot channels registration.
2. Click menu `Configuration` in `Settings`.
3. Paste the target message endpoint in text box `Messaging endpoint`.
![image](../images/fx-core/bot/update-message-endpoint-azure.png)

After updating message endpoint is done, continue to deploy and try the remote experience.

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