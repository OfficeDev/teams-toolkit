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

## How to reuse existing AAD in Toolkit v2?

Suppose an existing AAD has been registered, you can reuse this AAD by configuring Toolkit project settings.

### Register an AAD on Azure Portal
1. Manually create a new App Registration on [Azure Portal](https://ms.portal.azure.com/), note down the **Application (client) ID** on the "overview" page.
2. Create a client secret for the AAD created in step 1, note down the **client secret**.

![image](../images/fx-core/bot/AAD-secret.png)

3. Fill in the appid and secret in `${ProjectFolder}/.fx/configs/config.${env}.json`, add the `bot` section, and the settings will look like:
```
  "manifest": {
        "appName": {
            "short": "xxxx",
            "full": "Full name for xxxx"
        }
    },
    "bot": {
        "appId": "${Application (client) ID}",
        "appPassword": "${client secret}"
    }
```
4. Provision the Bot, then it will reuse this AAD and won't create a new one.
