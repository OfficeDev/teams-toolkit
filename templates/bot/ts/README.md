## Bot Hello World App

A bot also referred to as a chatbot or conversational bot is an app that runs simple and repetitive automated tasks performed by the users, such as customer service or support staff. Examples of bots in everyday use include, bots that provide information about the weather, make dinner reservations, or provide travel information. A bot interaction can be a quick question and answer, or it can be a complex conversation that provides access to services.

This is a simple hello world chatbot application with built-in Single Sign-on features using TeamsFx SDK that can respond to a simple `hello` message.

## Prerequisites
-	[NodeJS](https://nodejs.org/en/)
-	An M365 account, if you do not have M365 account, apply one from [M365 developer program](https://developer.microsoft.com/en-us/microsoft-365/dev-program)
-	Teams Toolkit or TeamsFx CLI

## Create an application
-	From Visual Studio Code, open command palette and select `Teamsfx - Start a new project` to create a new conversational bot.
-	From TeamsFx CLI, run command `teamsfx new` to create a new conversational bot.

## Build
-	From Teams Toolkit: In the project directory, execute “Teamsfx - Build Teams Package”.
-	From TeamsFx CLI: In the project directory, run command “teamsfx build”.

## Validate Manifest
-	From Teams Toolkit: To check that your manifest is valid, from command palette select: “Teamsfx - Validate App Manifest File”.
-	From TeamsFx CLI: run command `teamsfx test`

## Debug
Start debugging the project by hitting the `F5` key. Alternatively use the `Run Panel` in Visual Studio Code and click the `Start Debugging` green arrow button.

## Deploy to Azure
Deploy your project to Azure when it’s ready by following these steps:
-	Log in to your Azure account
-	Select an active subscription
-	Provision your application resources in the cloud
-	Deploy your application to the cloud


You can do this using the Teams Toolkit in Visual Studio Code or using the TeamsFx CLI:
| Using Teams Toolkit |	Using TeamsFx CLI |
|-----------------------------|------------------------------|
| Open Teams Toolkit, and sign into Azure by clicking the `Sign to Azure` under the ACCOUNT section from sidebar. |	Run command `teamsfx account login azure`.|
| Once signed in, select a subscription under your account. | Run command `teamsfx account set --subscription $scriptionid` | 
| Open command palette, select: `Teamsfx - Provision in the Cloud`. | Run command `teamsfx provision`. | 
| Open command palette, select: `Teamsfx - Deploy to the Cloud`. | Run command: `teamsfx deploy`. |
<br>
> Note: This may incur costs in your Azure Subscription.

## Publish to Teams
Once deployed, you may want to submit your application to your organization's internal app store. Your app will be submitted for admin approval.
-	With Teams Toolkit: open command palette, select: “Teamsfx - Publish to Teams”.
-	With TeamsFx CLI: run command “teamsfx publish”.


## Further reading
-	[Bot Basics](https://docs.microsoft.com/azure/bot-service/bot-builder-basics?view=azure-bot-service-4.0)
-	[Bot Framework Documentation](https://docs.botframework.com/)
-	[Azure Bot Service Introduction](https://docs.microsoft.com/azure/bot-service/bot-service-overview-introduction?view=azure-bot-service-4.0)


## Code of Conduct
This project has adopted the [Microsoft Open Source Code of Conduct](https://opensource.microsoft.com/codeofconduct/).
For more information see the [Code of Conduct FAQ](https://opensource.microsoft.com/codeofconduct/faq/) or
contact [opencode@microsoft.com](mailto:opencode@microsoft.com) with any additional questions or comments.
