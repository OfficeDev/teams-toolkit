# Build Conversational Bots for Teams

A bot also referred to as a chatbot or conversational bot is an app that runs simple and repetitive automated tasks performed by the users, such as customer service or support staff. Examples of bots in everyday use include, bots that provide information about the weather, make dinner reservations, or provide travel information. A bot interaction can be a quick question and answer, or it can be a complex conversation that provides access to services.

This is a simple hello world chatbot application with built-in Single Sign-on features using [TeamsFx SDK](https://github.com/OfficeDev/TeamsFx/tree/main/packages/sdk) that can respond to a simple `hello` message.

## Prerequisites
**Dependencies**
-  [NodeJS](https://nodejs.org/en/)
-  [M365 developer account](https://docs.microsoft.com/en-us/microsoftteams/platform/concepts/build-and-test/prepare-your-o365-tenant) or access to a Teams account with the appropriate permissions to install an app.

## Create an application
You can create a new bot application using the [Teams Toolkit V2 In Visual Studio Code](https://msazure.visualstudio.com/Microsoft%20Teams%20Extensibility/_wiki/wikis/Microsoft-Teams-Extensibility.wiki/150250/Public-Preview). From the toolkit, press `ctrl+shift+p` to open command palette and select `TeamsFx - Start a new project`. Follow these steps to finish project creation:
- Enter your App name.
- Select Bot.
- Select bot registrarion (Choose one of the following)
  - Create a new bot registration (This will create a new bot registration)
  - Reuse an existing bot registration (You can manually input the bot id and password to reuse a bot registration)
- Select a project location.

## Run the application locally
Start debugging the project by hitting the `F5` key or click the debug icon in Visual Studio Code and click the `Debug (Edge)` or `Debug (Chrome)` green arrow button. The Teams Toolkit will automatically start the tunelling and npm tasks for you. A browser will open up with Teams web client and let you install the bot.

Next, you interact with the bot application by sending a `hello` to it or type `login` / `logout` to test the SSO feature comes with this app. Setting break points to debug the application is also available.

## Deploy the application to Azure
Once you have seen the application successfully run locally, you can use the Teams Toolkit V2 to prepare cloud resources and deploy to Azure. Follow these steps:
- From Teams Toolkit V2, open command palette and select `TeamsFx - Provision Resource` (This requires you have an active Azure subscription) and this will:
  - Create a resource group under your subscription.
  - Create Azure Web App to host the chatbot.
  - Create AAD App registration for SSO.
- After resource provisioned successfully, select `TeamsFx - Deploy` and select `Bot` in next step. This will deploy your application package to the Azure Web App created earlier.

Once all steps completed, you chatbot is now running in the cloud.

## Run the application hosted in Azure
After your application successfully deployed in Azure, you can interact with your chatbot hosted in the cloud. From the Visual Studio Code debug meun, select `Launch Remote (Edge) ` or `Launch Remote (Chrome)`.

## Publish to Teams Tenant Catalog
You can publish your chatbot when it's ready for entire organization to use. Simply open command palette and select `TeamsFx - Publish Teams App` and it will submit your Teams application to tenant app catalog. This may require tenant admin to approve before it's available to your organization.

## Further reading
- [Bot Framework Documentation](https://docs.botframework.com)
- [Bot Basics](https://docs.microsoft.com/azure/bot-service/bot-builder-basics?view=azure-bot-service-4.0)
- [Azure Portal](https://portal.azure.com)
- [Activity processing](https://docs.microsoft.com/en-us/azure/bot-service/bot-builder-concept-activity-processing?view=azure-bot-service-4.0)
- [Azure Bot Service Introduction](https://docs.microsoft.com/azure/bot-service/bot-service-overview-introduction?view=azure-bot-service-4.0)
- [Azure Bot Service Documentation](https://docs.microsoft.com/azure/bot-service/?view=azure-bot-service-4.0)
- [.NET Core CLI tools](https://docs.microsoft.com/en-us/dotnet/core/tools/?tabs=netcore2x)
- [Azure CLI](https://docs.microsoft.com/cli/azure/?view=azure-cli-latest)
- [Azure Portal](https://portal.azure.com)
- [Language Understanding using LUIS](https://docs.microsoft.com/en-us/azure/cognitive-services/luis/)
- [Channels and Bot Connector Service](https://docs.microsoft.com/en-us/azure/bot-service/bot-concepts?view=azure-bot-service-4.0)
- [Microsoft Teams Developer Platform](https://docs.microsoft.com/en-us/microsoftteams/platform/)
