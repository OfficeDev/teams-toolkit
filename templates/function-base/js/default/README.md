# Build Backend APIs

When building a Teams application, you can optionally add backend API(s) to develop server-side logics.

## Prerequisites

- Teams Toolkit or TeamsFx CLI.

## Develop

Teams Toolkit and TeamsFx CLI can provide template code for you to get started. The starter code handles calls from your Teams App client side, initializes the TeamsFx SDK to access current connected user information and prepares a pre-authenticated Microsoft Graph Client for you to access more user's data. You can modify the template code with your custom logic or add more functions with `HTTPTrigger`. Read [Azure Functions developer guide](https://docs.microsoft.com/en-us/azure/azure-functions/functions-reference) for more development resources.

### Call Function

A common use case to call the function is sending an HTTP request to the service with an SSO token in the authorization header. The token can be retrieved from TeamsFx SDK from your app's client side. Here is an example code snippet:

```JavaScript
  var credential = new TeamsUserCredential();
  var accessToken = await credential.getToken('');
  var response = await axios.default.get(functionEndpoint + '/api/' + functionName, {
    headers: {
      authorization: "Bearer " + accessToken.token
    }
  });
```

### Add More Functions

- From Visual Studio Code: open the command palette, select `Teams: Add Resources` and select `Azure Function App`.
- From TeamsFx CLI: run command `teamsfx resource add azure-function` in your project directory.

## Deploy to Azure

Deploy your project to Azure when it’s ready by following these steps:

1. Log in to your Azure account
2. Select an active subscription
3. Provision your application resources in the cloud
4. Deploy your application to the cloud

You can do this using the Teams Toolkit in Visual Studio Code or using the TeamsFx CLI:

| Using Teams Toolkit                                                                                                                                                                                                                                                                                                                                                     | Using TeamsFx CLI                                                                                                                                                                                                            |
| :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| <ul><li>Open Teams Toolkit, and sign into Azure by clicking the `Sign in to Azure` under the `ACCOUNT` section from sidebar.</li> <li>After you signed in, select a subscription under your account.</li><li>Open the command palette and select: `Teams: Provision in the Cloud`.</li><li>Open the command palette and select: `Teams: Deploy to the Cloud`.</li></ul> | <ul> <li>Run command `teamsfx account login azure`.</li> <li>Run command `teamsfx account set --subscription $subscriptionid`.</li> <li> Run command `teamsfx provision`.</li> <li>Run command: `teamsfx deploy`. </li></ul> |

**Note: This may incur costs in your Azure Subscription.**

## Change Node.js runtime version

By default, Teams Toolkit and TeamsFx CLI will provision an Azure function app with function runtime version 3, and node runtime version 12. You can change the node version through Azure Portal.

- Sign in to [Azure Portal](https://azure.microsoft.com/).
- Find your application's resource group and Azure Function app resource. The resource group name and the Azure function app name are stored in your project configuration file `.fx/env.*.json`. You can find them by searching the key `resourceGroupName` and `functionAppName` in that file.
- After enter the home page of the Azure function app, you can find a navigation item called `Configuration` under `settings` group.
- Click `Configuration`, you would see a list of settings. Then click `WEBSITE_NODE_DEFAULT_VERSION` and update the value to `~10`, `~12` or `~14` according to your requirement.
- After Click `OK` button, don't forget to click `Save` button on the top of the page.

Then following requests sent to the Azure function app will be handled by new node runtime version.

## Code of Conduct

This project has adopted the [Microsoft Open Source Code of Conduct](https://opensource.microsoft.com/codeofconduct/).

For more information see the [Code of Conduct FAQ](https://opensource.microsoft.com/codeofconduct/faq/) or contact [opencode@microsoft.com](mailto:opencode@microsoft.com) with any additional questions or comments.
