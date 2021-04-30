## FreeServerFarmsQuotaError

### Error Message

The maximum number of Free App Service Plan allowed in a Subscription is 10.

### Mitigation

There are two methods to mitigate this issue:

#### Method #1
1. Delete other Free App Service Plan
2. Run `Provision` command again

#### Method #2
1. Open `.fx\env.default.json` file
2. Set value of 'skuName' config of 'fx-resource-bot' 
3. Run `Provision` command again

## MissingSubscriptionRegistrationError

### Eror Message

The subscription didn't register to use namespace 'Microsoft.BotService'.

### Mitigation

Please refer to this [link](https://aka.ms/rps-not-found) to register your subscription to use namespace 'Microsoft.BotService'.