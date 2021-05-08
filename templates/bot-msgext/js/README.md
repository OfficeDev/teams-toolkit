# Build Bots and Messaging Extensions for Teams

A *Bot* also referred to as a chatbot or conversational bot is an app that runs simple and repetitive automated tasks performed by the users, such as customer service or support staff. Examples of bots in everyday use include, bots that provide information about the weather, make dinner reservations, or provide travel information. A bot interaction can be a quick question and answer, or it can be a complex conversation that provides access to services.

A *Messaging Extension* allows users to interact with your web service through buttons and forms in the Microsoft Teams client. They can search, or initiate actions, in an external system from the compose message area, the command box, or directly from a message. 

This is a simple hello world application with both Bot and Message extension capabilities. You can learn how to build a Teams app with Bot and Message Extension at the same time.

## Prerequisites

* [Node.js](https://nodejs.org/en/)
* An M365 account, if you do not have M365 account, apply one from [M365 developer program](https://developer.microsoft.com/en-us/microsoft-365/dev-program)
* Teams Toolkit or TeamsFx CLI

## Create an application 

* From Visual Studio Code, there are two ways to create a new bot and messaging extension, select `Create New Project` in the left panel or directly open the command palette and select `Teams: Create New Project`.
* From TeamsFx CLI, run command `teamsfx new` to create a new bot and messaging extension.
> Note: You have the option to reuse an existing bot by entering the credential manually. But make sure that bot is not associated with any AAD apps.

## Debug

Start debugging the project by hitting the `F5` key. Alternatively use the `Run Panel` in Visual Studio Code and click the `Start Debugging` green arrow button.

## Build

* From Visual Studio Code: open the command palette and select `Teams: Build Teams Package`.
* From TeamsFx CLI: run command `teamsfx build` in the project directory.

## Validate manifest file

To check that your manifest file is valid or not:
* From Visual Studio Code: open the command palette and select: `Teams: Validate App Manifest File`.
* From TeamsFx CLI: run command `teamsfx validate` in your project directory.

## Deploy to Azure

Deploy your project to Azure when it’s ready by following these steps:

1. Log in to your Azure account
2. Select an active subscription
3. Provision your application resources in the cloud
4. Deploy your application to the cloud

You can do this using the Teams Toolkit in Visual Studio Code or using the TeamsFx CLI:

| Using Teams Toolkit| Using TeamsFx CLI|
| :------------------| :----------------|
| <ul><li>Open Teams Toolkit, and sign into Azure by clicking the `Sign in to Azure` under the `ACCOUNT` section from sidebar.</li> <li>After you signed in, select a subscription under your account.</li><li>Open the command palette and select: `Teams: Provision in the Cloud`.</li><li>Open the command palette and select: `Teams: Deploy to the Cloud`.</li></ul>  | <ul> <li>Run command `teamsfx account login azure`.</li> <li>Run command `teamsfx account set --subscription $subscriptionid`.</li> <li> Run command `teamsfx provision`.</li> <li>Run command: `teamsfx deploy`. </li></ul>|

>Note: This may incur costs in your Azure Subscription.

## Publish to Teams

Once deployed, you may want to submit your application to your organization's internal app store. Your app will be submitted for admin approval.

* From Visual Studio Code: open the command palette and select: `Teams: Publish to Teams`.
* From TeamsFx CLI: run command `teamsfx publish` in your project directory.


## Further reading

### Bot
* [Bot Basics](https://docs.microsoft.com/azure/bot-service/bot-builder-basics?view=azure-bot-service-4.0)
* [Bot Framework Documentation](https://docs.botframework.com/)
* [Azure Bot Service Introduction](https://docs.microsoft.com/azure/bot-service/bot-service-overview-introduction?view=azure-bot-service-4.0)

### Messaging Extension
* [Search Command](https://docs.microsoft.com/en-us/microsoftteams/platform/messaging-extensions/how-to/search-commands/define-search-command)
* [Action Command](https://docs.microsoft.com/en-us/microsoftteams/platform/messaging-extensions/how-to/action-commands/define-action-command)
* [Link Unfurling](https://docs.microsoft.com/en-us/microsoftteams/platform/messaging-extensions/how-to/link-unfurling?tabs=dotnet)

## Code of Conduct

This project has adopted the [Microsoft Open Source Code of Conduct](https://opensource.microsoft.com/codeofconduct/).

For more information see the [Code of Conduct FAQ](https://opensource.microsoft.com/codeofconduct/faq/) or
contact [opencode@microsoft.com](mailto:opencode@microsoft.com) with any additional questions or comments.