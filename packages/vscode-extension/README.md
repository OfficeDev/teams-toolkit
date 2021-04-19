# Microsoft Teams Toolkit for Visual Studio Code

## What is the Teams Toolkit?

The Teams Toolkit helps developers create and deploy Teams apps with integrated Identity, access to cloud storage, data from [Microsoft Graph](https://docs.microsoft.com/en-us/graph/teams-concept-overview), and other services in [Azure](https://docs.microsoft.com/en-us/microsoftteams/platform/build-your-first-app/build-bot) and [M365](https://docs.microsoft.com/en-us/microsoftteams/platform/concepts/build-and-test/prepare-your-o365-tenant) with a “zero-configuration” approach to the developer experience.

## How to use Teams Toolkit?  

The toolkit provides easier, faster and empowering user experience to build Teams apps. Under the Teams Toolkit extension tab, you can easily discover all applicable commands in the sidebar and Command palette with a keyword ‘TeamsFx’. It also supports [Command Line Interface (CLI)](https://github.com/OfficeDev/TeamsFx/tree/main/packages/cli) to increase efficiency.

## What are Teams app “Capabilities”?

Teams apps are a combination of [capabilities](https://docs.microsoft.com/en-us/microsoftteams/platform/concepts/capabilities-overview) and [entry points](https://docs.microsoft.com/en-us/microsoftteams/platform/concepts/extensibility-points). For example, people can chat with your app's bot (capability) in a channel (entry point).

<table style="border-collapse: collapse">
    <tr>
        <td><img src="./media/landingPage_launchPage.png"></td>
        <td><img src="./media/landingPage_conversationalBot.png"></td>
        <td><img src="./media/landingPage_messagingExtension.png"></td>
    </tr>
    <tr>
        <td style="border: none">Launch Pages</td>
        <td style="border: none">Conversational Bots</td>
        <td style="border: none">Messaging Extensions</td>
    </tr>
    <tr>
        <td style="border: none" width="33%"><a href=https://docs.microsoft.com/en-us/microsoftteams/platform/tabs/what-are-tabs>Launch Pages</a> are Teams-aware webpages embedded in Microsoft Teams. They are simple HTML tags that point to domains declared in the app manifest and can be added as part of a channel inside a team, group chat, or personal app for an individual user.</td>
        <td style="border: none; vertical-align: baseline" width="33%"><a href=https://docs.microsoft.com/en-us/microsoftteams/platform/bots/what-are-bots>Conversational bots</a> allow users to interact with your web service through text, interactive cards, and task modules.</td>
        <td style="border: none; vertical-align: baseline" width="33%"><a href=https://docs.microsoft.com/en-us/microsoftteams/platform/messaging-extensions/what-are-messaging-extensions>Messaging extensions</a> allow users to interact with your web service through buttons and forms in the Microsoft Teams client.</td>
    </tr>
</table>

## Build a Teams app in less than 5 minutes

Build a Teams app from the scratch or explore our [samples](www.baidu.com) to help you quickly get started with the basic Teams app concepts and code structures.

<table style="border-collapse: collapse">
    <tr>
        <td><img src="./media/landingPage_shareNow.png"></td>
        <td><img src="./media/landingPage_poll.png"></td>
        <td><img src="./media/landingPage_faq.png"></td>
    </tr>
    <tr>
        <td style="border: none">Share Now</td>
        <td style="border: none">Poll</td>
        <td style="border: none">FAQ Plus</td>
    </tr>
    <tr>
        <td style="border: none" width="33%">The Share Now app promotes the positive exchange of information between colleagues by enabling your users to easily share content within the Teams environment.</td>
        <td style="border: none; vertical-align: baseline" width="33%">Poll is a custom Microsoft Teams messaging extension app that enables you to quickly create and send polls in a chat or a channel to gather team opinions and preferences.</td>
        <td style="border: none; vertical-align: baseline" width="33%">FAQ bot is a friendly Q&A bot that brings a human in the loop when it is unable to help. One can ask the bot a question and the bot responds with an answer if it is contained in the knowledge base.</td>
    </tr>
</table>

## M365 and Azure account

>Don’t have a M365 to experience building Teams app? Sign up for [Microsoft Developer Program](https://developer.microsoft.com/en-us/microsoft-365/dev-program), which allows you to have a testing tenant with preconfigured permissions.

<table style="border-collapse: collapse">
    <tr>
        <td><img src="./media/landingPage_m365.png"></td>
        <td><h3>M365</h3>The Teams Toolkit requires a Microsoft 365 organizational account where Teams is running and has been registered.</td>
    </tr>
    <tr>
        <td style="border: none"><img src="./media/landingPage_azure.png"></td>
        <td style="border: none"><h3>Azure</h3> The Teams Toolkit may require an Azure account and subscription to deploy the Azure resources for your project.</td>
    </tr>
</table>

## Configure your app

At its core, the Teams app embraces three components:

- The Microsoft Teams client (web, desktop or mobile) where users interact with your app.
- A server that responds to requests for content that will be displayed in Teams, e.g., HTML tab content or a bot adaptive card .
- A Teams app package consisting of three files:

  ✔️ The manifest.json.

  ✔️ A color icon for your app to display in the public or organization app catalog.

  ✔️ An outline icon for display on the Teams activity bar.

When an app is installed, the Teams client parses the manifest file to determine needed information like the name of your app and the URL where the services are located.

- To configure your app, navigate to the Microsoft Teams Toolkit tab in Visual Studio Code.
- Go to Manifest Editor in the sidebar menu to edit the manifest.json of your Teams app.
- The toolkit will automatically update the app registration data accordingly during app side-loading and publish.

## Debug your app on your local dev environment

Prerequisites: [Enable Teams developer preview mode](https://docs.microsoft.com/en-us/microsoftteams/platform/resources/dev-preview/developer-preview-intro#enable-developer-preview)

Simply press F5 to run your first Teams or navigate to the Debug tab in the activity bar and select Run icon to display the Run and Debug view. As a default, the toolkit will automatically help you to setup local environment and load the app in Teams.

## Preview your app with backend running in the cloud

If you want to have a better estimation of how the app will behave in the cloud environment, you can deploy your resources to the cloud and preview your app with the backend running in the cloud (remote).
