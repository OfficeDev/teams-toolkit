# Build Teams Application Backend with Microsoft Teams Framework (TeamsFX) and Azure Functions

When building a Teams application, TeamsFX provides an option for you to add a backend API to develop server-side logics so that you can easily build your systems to react to a series of critical events. The API you added is actually an [Azure Functions](https://docs.microsoft.com/en-us/azure/azure-functions/) project that handles HTTP requests from Tabs, and you can customize it according to your requirements.

## Prerequisites

To start enjoying full functionalities to develop an API with Azure Functions for your Teams Application, you need to:
- Install [Azure Functions Core Tools](https://docs.microsoft.com/en-us/azure/azure-functions/functions-run-local?tabs=windows%2Ccsharp%2Cbash).
- Install [TeamsFX Server SDK Package](https://aka.ms/MODSPrivatePreview/server-sdk).
- Add an API during project creation or using command, see [TeamsFX User Manual](https://mods-landingpage-web.azurewebsites.net/md/guide/index).

## Develop

By default, TeamsFX will provide template code for you to get started. The starter code handles calls from your Teams App client side, initializes the TeamsFX server SDK to access current connected user information and prepares a pre-authenticated Microsoft Graph Client for you to access more user's data. You can modify the template code with your custom logics or add more functions with `HTTPTrigger` by running command `TeamsFx - Add Resource` and select `function`. Read on [Azure Functions developer guide](https://docs.microsoft.com/en-us/azure/azure-functions/functions-reference) for more development resources.

## Trigger Function

- Invoking TeamsFX client SDK API `callFunction()` from Tabs.
- Sending an HTTP request to the service. However, TeamsFX binding always checks the SSO token of
  received HTTP request before function handles the request. Thus, requests without a valid SSO token would cause function responses HTTP error 500.

## Deploy to Azure

- Provision Azure environment by running command `TeamsFx - Provision Resource`.
- Deploy your project to the Azure function app by running command - `TeamsFx - Deploy Package` and select `Azure Function`.

## Node version
The runtime versions supported by Azure Functions are list [here](https://docs.microsoft.com/en-us/azure/azure-functions/functions-versions). By default, TeamsFX toolkit provisions an Azure function app with function runtime version 3, and node runtime version 12. You can change the node version through Azure Portal.

- Sign in [Azure Portal](https://azure.microsoft.com/).
- Find the Azure function app. The resource group name and the Azure function app name are recorded in the file '.fx/env.*.json'. You can find them by searching the key 'resourceGroupName' and 'functionAppName' in that file.
- After enter the home page of the Azure function app, you can find a nav item called 'Configuration' under 'settings' group.
- Click 'Configuration', you would see a list of settings. Then click 'WEBSITE_NODE_DEFAULT_VERSION' and update the value to '~10', '~12' or '~14' according to your requirement.
- After Click 'OK' button, don't forget to click 'Save' button on the top of the page.
- Then following requests sent to the Azure function app will be handled by the node with new version.
