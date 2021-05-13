# Build Messaging Extensions for Teams

*Messaging extensions* allows users to interact with your web service through buttons and forms in the Microsoft Teams client. They can search, or initiate actions, in an external system from the compose message area, the command box, or directly from a message. 

## Prerequisites

* [Node.js](https://nodejs.org/en/)
* An M365 account, if you do not have M365 account, apply one from [M365 developer program](https://developer.microsoft.com/en-us/microsoft-365/dev-program)
* Teams Toolkit or TeamsFx CLI

## Create an application 

* From Visual Studio Code, there are two ways to create a new messaging extension, select `Create New Project` in the left panel or directly open the command palette and select `Teams: Create New Project`.
* From TeamsFx CLI, run command `teamsfx new` to create a new messaging extension. 

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

## Use the App
Once the message extension is published to Teams (or in local preview mode), you can start playing around with it. The template provides some simple functionalities: 
* You can search `npm` packages.
* You can create and send an adaptive card.
![CreateCard](./images/AdaptiveCard.png)
* You can share a message in an adaptive card form.
![ShareMessage](./images/ShareMessage.png)
* You can paste a link with monitored domain (`.botframwork.com` is monitored in this template) and a card will be rendered.
![ComposeArea](./images/LinkUnfurlingImage.png)

To trigger these functionalities, there are multiple entry points:
* `@mention` Your messaging extension, from the `search box area`.
![AtBotFromSearch](./images/AtBotFromSearch.png)
* `@mention` your messaging extension from the `compose message area`.
![AtBotFromMessage](./images/AtBotInMessage.png)
* Click the `...` under compose message area, find your messaging extension.
![ComposeArea](./images/ThreeDot.png)
* Click the `...` next to any messages you received or sent.
![ComposeArea](./images/ThreeDotOnMessage.png)
 
## Further reading

* [Search Command](https://docs.microsoft.com/en-us/microsoftteams/platform/messaging-extensions/how-to/search-commands/define-search-command)
* [Action Command](https://docs.microsoft.com/en-us/microsoftteams/platform/messaging-extensions/how-to/action-commands/define-action-command)
* [Link Unfurling](https://docs.microsoft.com/en-us/microsoftteams/platform/messaging-extensions/how-to/link-unfurling?tabs=dotnet)

## Code of Conduct

This project has adopted the [Microsoft Open Source Code of Conduct](https://opensource.microsoft.com/codeofconduct/).

For more information see the [Code of Conduct FAQ](https://opensource.microsoft.com/codeofconduct/faq/) or
contact [opencode@microsoft.com](mailto:opencode@microsoft.com) with any additional questions or comments.