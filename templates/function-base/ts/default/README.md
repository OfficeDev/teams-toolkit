# Build Teams Application Backend with Microsoft Teams Framework (TeamsFX) and Azure Functions

When building a Teams application, TeamsFX provides an option for you to add a backend API to develop server-side logics so that you can easily build your systems to react to a series of critical events. The API you added is actually an [Azure Functions](https://docs.microsoft.com/en-us/azure/azure-functions/) project that handles HTTP requests from Tabs, and you can customize it according to your requirements.

## Prerequisites

To start enjoying full functionalities to develop an API with Azure Functions for your Teams Application, you need to:
- Install TeamsFX extension from the Visual Studio Code extensions marketplace, read more [here](aka.ms/teamsfx).
- Install [Azure Functions Core Tools](https://docs.microsoft.com/en-us/azure/azure-functions/functions-run-local?tabs=windows%2Ccsharp%2Cbash).
- Add an API during project creation or using command, see [TeamsFX User Manual]().

## Develop

By default, TeamsFX will provide template code for you to get started. The starter code handles calls from your Teams App client side, initializes the TeamsFX SDK to access current connected user information and prepares a pre-authenticated Microsoft Graph Client for you to access more user's data. You can modify the template code with your custom logic or add more functions with `HTTPTrigger`. Read [Azure Functions developer guide](https://docs.microsoft.com/en-us/azure/azure-functions/functions-reference) for more development resources.

## Add More Functions (with TeamsFX Visual Studio Code Extension)

- Run command `TeamsFx - Add Resource` and select `function`.

## Add More Functions (with TeamsFX CLI)

- Run command `teamsfx resource add azure-function`.

## Deploy to Azure (with TeamsFX Visual Studio Code Extension)

- Provision Azure environment by running command `TeamsFx - Provision Resource`.
- Deploy your project to the Azure function app by running command - `TeamsFx - Deploy Package` and select `Azure Function`.

## Deploy to Azure (with TeamsFX CLI)

- Provision Azure environment by running command `teamsfx provision --subscription $subscriptionId`.
- Deploy your project to the Azure function app by running command `teamsfx deploy --deploy-plugin fx-resource-function`.

## Trigger Function

- Send an HTTP request to the service with an SSO token in the authorization header. The token can be queried from TeamsFX SDK in Teams App client side, here is a sample.
```
  var credential = new TeamsUserCredential();
  var accessToken = await credential.getToken('');
  var response = await axios.default.get(functionEndpoint + '/api/' + functionName, {
    headers: {
      authorization: "Bearer " + accessToken.token
    }
  });
```

## Node version

The runtime versions supported by Azure Functions are list [here](https://docs.microsoft.com/en-us/azure/azure-functions/functions-versions). By default, TeamsFX toolkit provisions an Azure function app with function runtime version 3, and node runtime version 12. You can change the node version through Azure Portal.

- Sign in [Azure Portal](https://azure.microsoft.com/).
- Find the Azure function app. The resource group name and the Azure function app name are recorded in the file '.fx/env.*.json'. You can find them by searching the key 'resourceGroupName' and 'functionAppName' in that file.
- After enter the home page of the Azure function app, you can find a nav item called 'Configuration' under 'settings' group.
- Click 'Configuration', you would see a list of settings. Then click 'WEBSITE_NODE_DEFAULT_VERSION' and update the value to '~10', '~12' or '~14' according to your requirement.
- After Click 'OK' button, don't forget to click 'Save' button on the top of the page.
- Then following requests sent to the Azure function app will be handled by the node with new version.
