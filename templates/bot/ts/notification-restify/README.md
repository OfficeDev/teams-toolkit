# Send notifications to Teams

The Notification in Teams feature enables you to consume, transform  and post events as plain text or [adaptive cards](https://docs.microsoft.com/microsoftteams/platform/task-modules-and-cards/cards/cards-reference) to an individual, chat, or channel in Teams.

This app is built with the [Microsoft Bot Framework](https://dev.botframework.com/) running on a restify server running on App Service along with the [Azure Bot Service](https://azure.microsoft.com/services/bot-services/).

Here is a screen shot of the app running:

![Notification Message in Teams](https://user-images.githubusercontent.com/11220663/166959087-a13abe67-e18a-4979-ab29-a8d7663b3489.png)

# Getting Started

Run your app with local debugging by pressing `F5` in VSCode. Select `Debug (Edge)` or `Debug (Chrome)`.

**Congratulations**! You are running an application that can now send notifications to Teams.

## Test your notification

To test your notification deployed on `restify`:

* Send a POST request to `http://<endpoint>/api/notification` with your favorite tool (like `Postman`)
  * When your project is running locally, replace `<endpoint>` with `localhost:3978`
  * When your project is deployed to Azure App Service, replace `<endpoint>` with the url from Azure App Service

>
> **Prerequisites**
>
> To run locally, you will need:
>
> - `Node.js` installed locally (recommended version: 14)
> - An [M365 account for development](https://docs.microsoft.com/microsoftteams/platform/toolkit/accounts)
>

# Understanding the code

This section walks through the generated code. The project folder contains the following:

| Folder | Contents |
| - | - |
| `.fx` | Project level settings, configurations, and environment information |
| `.vscode` | VSCode files for local debug |
| `bot` | The source code for the notification Teams application |
| `templates` | Templates for the Teams application manifest and for provisioning Azure resources |

The notification implementation is in `bot` folder.

The following files provide the business logic for notifications. These files can be updated to fit your business logic requirements. The default implementation provides a starting point to help you get started.

| File | Contents |
| - | - |
| `src/index.ts` | Application entry point and `restify` handlers for notifications |
| `src/adaptiveCards/notification-default.json` | A generated Adaptive Card that is sent to Teams |
| `src/cardModels.ts` | The default Adaptive Card data model |

The following files implement the core notification on the Bot Framework. You generally will not need to customize these files except when you want to implement your own storages, see [customize storage](#customize-storage).

| File / Folder | Contents |
| - | - |
| `src/internal/initialize.ts` | Application initialization |

The following files are project-related files. You generally will not need to customize these files.

| File / Folder | Contents |
| - | - |
| `.funcignore` | Azure Functions ignore file to exclude local files |
| `.gitignore` | Git ignore file |
| `host.json` | Azure Functions host file |
| `local.settings.json` | Azure Functions settings for local debugging |
| `package.json` | NPM package file |

# Customize your application

By default the application registers a route with `restify`. When a request is made to this route, the application will send a notification to Teams.

This section outlines some customization you can do to adopt the application for your needs.

## Customize the event source

By default Teams Toolkit scaffolds a single `restify` entry point in `src/index.ts`. When a HTTP request is sent to this entry point, the default implementation sends a hard-coded Adaptive Card to Teams.

You can customize this behavior by customizing `src/index.ts`. A typical implementation might make an API call to retrieve some events and/or data, and then send an Adaptive Card as appropriate.

Teams Toolkit enables you to [easily connect to an existing API](#connect-to-existing-apis).

## Customize the Adaptive Card

You can edit the file `src/adaptiveCards/notification-default.json` to customize the Adaptive Card to your liking. The file `src/cardModels.ts` defines a data structure that is used to fill data for the Adaptive Card.

The binding between the model and the Adaptive Card is done by name matching (for example,`CardData.title` maps to `${title}` in the Adaptive Card). You can add, edit, or remove properties and their bindings to customize the Adaptive Card to your needs.

You can also add new cards if appropriate for your application. Please follow this [sample](https://aka.ms/teamsfx-adaptive-card-sample) to see how to build different types of adaptive cards with a list or a table of dynamic contents using `ColumnSet` and `FactSet`.

## Connect to existing APIs

Often you need to connect to existing APIs in order to retrieve data to send to Teams. Teams Toolkit makes it easy for you to configure and manage authentication for existing APIs. 

For more information, [click here](https://aka.ms/teamsfx-connect-api).

## Customize where notifications are sent

By default, the notification is sent to a new private chat between your M365 user and the application. You can customize where each notification is delivered by editing the notification source file (for example, `src/index.ts`).

### Send notifications to a team/channel

Update the code to:

``` javascript
// list all installation targets
for (const target of await bot.notification.installations()) {
    // "Channel" means this bot is installed to a Team (default to notify General channel)
    if (target.type === "Channel") {
        // Directly notify the Team (to the default General channel)
        await target.sendAdaptiveCard(...);

        // List all members in the Team then notify each member
        const members = await target.members();
        for (const member of members) {
            await member.sendAdaptiveCard(...);
        }

        // List all channels in the Team then notify each channel
        const channels = await target.channels();
        for (const channel of channels) {
            await channel.sendAdaptiveCard(...);
        }
    }
}
```

### Send notifications to a group chat

Update the code to:

``` javascript
// list all installation targets
for (const target of await bot.notification.installations()) {
    // "Group" means this bot is installed to a Group Chat
    if (target.type === "Group") {
        // Directly notify the Group Chat
        await target.sendAdaptiveCard(...);

        // List all members in the Group Chat then notify each member
        const members = await target.members();
        for (const member of members) {
            await member.sendAdaptiveCard(...);
        }
    }
}
```

### Send notifications to a personal chat

Update the code to:

``` javascript
// list all installation targets
for (const target of await bot.notification.installations()) {
    // "Person" means this bot is installed as Personal app
    if (target.type === "Person") {
        // Directly notify the individual person
        await target.sendAdaptiveCard(...);
    }
}
```

### Customize storage

You can initialize with your own storage. This storage will be used to persist notification connections.

> Note: It's recommended to use your own shared storage for production environment. If `storage` is not provided, a default local file storage will be used, which stores notification connections into:
>   - *.notification.localstore.json* if running locally
>   - *${process.env.TEMP}/.notification.localstore.json* if `process.env.RUNNING_ON_AZURE` is set to "1"

``` typescript
// implement your own storage
class MyStorage implements NotificationTargetStorage {...}
const myStorage = new MyStorage(...);

// initialize ConversationBot with notification enabled and customized storage
const bot = new ConversationBot({
    // The bot id and password to create BotFrameworkAdapter.
    // See https://aka.ms/about-bot-adapter to learn more about adapters.
    adapterConfig: {
        appId: process.env.BOT_ID,
        appPassword: process.env.BOT_PASSWORD,
    },
    // Enable notification
    notification: {
        enabled: true,
        storage: myStorage,
    },
});
```

**[This Sample](https://github.com/OfficeDev/TeamsFx-Samples/blob/ga/adaptive-card-notification/bot/src/storage/blobsStorage.ts)** provides a sample implementation that persists to Azure Blob Storage.

## Add command and responses to your application

The command and response feature adds the ability for your application to "listen" to commands sent to it via a Teams message. A response (in the form of an Adaptive Card) is sent back to Teams. You can register multiple commands and have individual responses for each command.

To add the command and response feature:

1. Go to `src\internal\initialize.ts`
2. Update the `conversationBot` initialization to enable command-response feature: 
   ![enable-command](https://user-images.githubusercontent.com/10163840/165430233-04648a2a-d637-41f0-bb17-b34ddbd609f7.png)
3. Follow [these instructions](https://aka.ms/teamsfx-command-response#How-to-add-more-command-and-response) to add commands to your application.

## Customize the initialization

The default initialization is located in `bot/src/internal/initialize.js`.

You can update the initialization logic to:

- Set `options.adapter` to use your own `BotFrameworkAdapter`
- Set `options.notification.storage` to use your own `NotificationTargetStorage`
- Set `options.{feature}.enabled` to enable more `ConversationBot` functionality

To learn more, visit [additional initialization customizations](https://aka.ms/teamsfx-notification#initialize).

## Add authentication to your restify API

The scaffolded `restify` endpoint does not have authentication / authorization enabled. We suggest you add authentication / authorization for this API before using it in production. Here are some methods to add authentication / authorization to your endpoint.

1. Use an API Key
2. Use an access token issued by [Azure Active Directory](https://docs.microsoft.com/azure/active-directory/authentication/)
3. There are additional options that may be suitable for your business requirements.

## Update the Teams application manifest

You can find the Teams application manifest in `templates/appPackage/manifest.template.json`.

The file contains template arguments with `{...}` statements which will be replaced at build time. You may add any extra properties or permissions you require to this file.

See the [schema reference](https://docs.microsoft.com/microsoftteams/platform/resources/schema/manifest-schema) for more information.

# Additional information

* [Frequently asked questions](https://aka.ms/teamsfx-notification##frequently-asked-questions) for sending notifications
* Manage [multiple environments](https://docs.microsoft.com/microsoftteams/platform/toolkit/teamsfx-multi-env)
* [Collaborate](https://docs.microsoft.com/microsoftteams/platform/toolkit/teamsfx-collaboration) with others

# References

* [Teams Toolkit Notification Tutorial](https://aka.ms/teamsfx-notification)
* [Teams Toolkit Documentations](https://docs.microsoft.com/microsoftteams/platform/toolkit/teams-toolkit-fundamentals)
* [Teams Toolkit CLI](https://docs.microsoft.com/microsoftteams/platform/toolkit/teamsfx-cli)
* [TeamsFx SDK](https://docs.microsoft.com/microsoftteams/platform/toolkit/teamsfx-sdk)
* [Teams Toolkit Samples](https://github.com/OfficeDev/TeamsFx-Samples)