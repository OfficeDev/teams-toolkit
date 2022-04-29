# Send notification to Teams

Notification in Teams means you can proactively message an individual person, a chat, or a channel via plain text or different [cards](https://docs.microsoft.com/en-us/microsoftteams/platform/task-modules-and-cards/cards/cards-reference).

This template implements notification as a Teams bot application with restify server. For example, with this template, once notification being triggered, it sends text, card, or other message(s) to Teams:

![Notification Message in Teams](images/notification-message.png)

## Get Started

Before running this app locally, make sure you have prepared these prerequisites:

- Node.js (Recommended version is 14)
- An [M365 account for development](https://docs.microsoft.com/microsoftteams/platform/toolkit/accounts)

Then, you can quickly start local debugging via `F5` in VSCode. Select `Debug (Edge)` or `Debug (Chrome)` debug option of your preferred browser.

> **Note**: This app will setup [Microsoft Bot Framework](https://dev.botframework.com/) or [Azure Bot Service](https://azure.microsoft.com/services/bot-services/) for further running.
>
> If your account has no access to such resource(s), there's an alternative way to send notification via **Incoming Webhook**.
>
> Try the Incoming Webhook sample via `Create a new Teams app` -> `Start from a sample` -> `Incoming Webhook Notification`. Or browse the code at our [Sample Repo](https://github.com/OfficeDev/TeamsFx-Samples), `incoming-webhook-notification` folder.

## Develop

This new project folder structure looks like:

| Folder | Contents |
| - | - |
| `.fx` | Project level settings, configurations, and environment information |
| `.vscode` | VSCode files for local debug |
| `bot` | The bot source code |
| `templates` |Templates for Teams app manifest and corresponding Azure resources|

The core notification implementation is in `bot/` folder, containing following content:

| File / Folder | Contents |
| - | - |
| `src/adaptiveCards/` | Adaptive card templates |
| `src/internal/` | Generated initialize code for notification functionality |
| `src/cardModels.*s` | Adaptive card data models |
| `src/index.*s` | The entrypoint to handle bot messages and send notifications |
| `.gitignore` | The git ignore file to exclude local files from bot project |
| `package.json` | The NPM package file for bot project |

### Initializations

The default initialization is located in `bot/src/internal/initialize.*s`:

``` javascript
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
    },
});
```

You can also add your own initialization logic to:

- Set `options.adapter` to use your own `BotFrameworkAdapter` with additional bot logic
- Set `options.notification.storage` to use your own `NotificationTargetStorage` for persistency on production environment
- Set `options.{feature}.enabled` to enable more functionalities of `ConversationBot`

### Send notifications

The default notifying logic is located in `bot/src/index.*s`, and you can also customize the targets and messages:
- Use `target.type` to distinguish different targets
- Use `target.members()`, `target.channels()` to get more targets
- Send your own card message
- Send POST request to the `http://<endpoint>/api/notification` with your favorite tools like postman.
  - When your project is running locally, replace `<endpoint>` with `localhost:3978`
  - When your project is deployed to the cloud, replace `<endpoint>` with the url from your hosting resource.

Below are some code snippets to send notifications in channel, group chat or personal conversation.

#### Send notification in team/channel

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

#### Send notification in group chat

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

#### Send notification in personal chat

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

### Add more triggers

You can add any Azure Functions trigger(s) with your own `function.json file` and code file(s). See Azure Functions [supported triggers](https://docs.microsoft.com/en-us/azure/azure-functions/functions-triggers-bindings?tabs=javascript#supported-bindings).

### Customize adapter

You can initialize with your own adapter, or customize after initialization.

``` typescript
// Create your own adapter
const adapter = new BotFrameworkAdapter(...);

// Customize your adater, e.g., error handling
adapter.onTurnError = ...

const bot = new ConversationBot({
    // use your own adapter
    adapter: adapter;
    ...
});

// Or, customize later
bot.adapter.onTurnError = ...
```

### Customize storage

The storage will be used to persist notification connections, you can initialize with your own storage.

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

**[This Sample](https://github.com/OfficeDev/TeamsFx-Samples/blob/ga/adaptive-card-notification/bot/src/storage/blobsStorage.ts)** provides a reference implementation that persists to Azure Blob Storage.

> Note: It's recommended to use your own shared storage for production environment. If `storage` is not provided, a default local file storage will be used, which stores notification connections into:
>   - *.notification.localstore.json* if running locally
>   - *${process.env.TEMP}/.notification.localstore.json* if `process.env.RUNNING_ON_AZURE` is set to "1"

### Connect to existing API

You usually want to access data or information when building Teams application. If you do not have an appropriate SDK that helps you make an API request, Teams Toolkit is here to help you bootstrap sample code which handles authentication for your API requests. For more information, you can visit [Connect existing API document](https://aka.ms/teamsfx-connect-api).

### Add authentication for your notification API

The scaffolded notification API does not have authentication / authorization enabled. We suggest you add authentication / authorization for this API before using it for production purpose. Here're some common ways to add authentication / authorization for an API:

1. Use an API Key

2. Use an access token issued by [Azure Active Directory](https://docs.microsoft.com/en-us/azure/active-directory/authentication/)

There would be more authentication / authorization solutions for an API. You can choose the one that satisfies your requirement best.

### Extend this app with command and response

1. Go to `bot\src\internal\initialize.ts(js)`, update your `conversationBot` initialization to enable command-response feature:

   ![enable-command](https://user-images.githubusercontent.com/10163840/165430233-04648a2a-d637-41f0-bb17-b34ddbd609f7.png)

1. Follow [this instruction](#How-to-add-more-command-and-response) to add command to your bot.

### Edit Teams App manifest

You can find the Teams app manifest in `templates/appPackage/manifest.template.json`.

The file contains template arguments with `{...}` statements which will be replaced at build time. You may add any extra properties or permissions you require to this file. See the [schema reference](https://docs.microsoft.com/microsoftteams/platform/resources/schema/manifest-schema) for more information.

### More development documentations

* [Frequently asked questions](https://aka.ms/teamsfx-notification##frequently-asked-questions) for sending notifications
* Manage [multiple environments](https://docs.microsoft.com/en-us/microsoftteams/platform/toolkit/teamsfx-multi-env)
* [Collaborate](https://docs.microsoft.com/en-us/microsoftteams/platform/toolkit/teamsfx-collaboration) with others

## Deployment

Teams Toolkit simplifies the process for you when moving this application to the cloud.
* Provision cloud resource for your app using ARM templates, see: [Use Teams Toolkit to provision cloud resources](https://docs.microsoft.com/microsoftteams/platform/toolkit/provision) for more information.
* Deploy your application to the cloud with a single command see: [Deploy to the cloud](https://docs.microsoft.com/microsoftteams/platform/toolkit/deploy).
* Set up automation pipelines with [CI/CD support](https://docs.microsoft.com/en-us/microsoftteams/platform/toolkit/use-cicd-template)
* With your application running in the cloud, preview your app in Teams via [Run the deployed app](https://docs.microsoft.com/microsoftteams/platform/sbs-gs-javascript?tabs=vscode%2Cvsc%2Cviscode%2Cvcode&tutorial-step=8#run-the-deployed-app).
* Distribute your application by [Publish Teams apps using Teams Toolkit](https://docs.microsoft.com/microsoftteams/platform/toolkit/publish).

## Reference

* [Teams Toolkit Notification Tutorial](https://aka.ms/teamsfx-notification)
* [Teams Toolkit Documentations](https://docs.microsoft.com/microsoftteams/platform/toolkit/teams-toolkit-fundamentals)
* [Teams Toolkit CLI](https://docs.microsoft.com/microsoftteams/platform/toolkit/teamsfx-cli)
* [TeamsFx SDK](https://docs.microsoft.com/microsoftteams/platform/toolkit/teamsfx-sdk)
* [Teams Toolkit Samples](https://github.com/OfficeDev/TeamsFx-Samples)