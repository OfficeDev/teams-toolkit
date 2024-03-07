# Overview of the AI Assistant Bot template

This app template is built on top of [Teams AI library](https://aka.ms/teams-ai-library) and [OpenAI Assistants API](https://platform.openai.com/docs/assistants/overview).
It showcases how to build an intelligent chat bot in Teams capable of helping users accomplish specific tasks using natural language right in the Teams conversations, such as solving a math problem, call functions to get city weather, etc.

- [Overview of the AI Assistant Bot template](#overview-of-the-ai-assistant-bot-template)
  - [Get started with the AI Assistant Bot template](#get-started-with-the-ai-assistant-bot-template)
  - [What's included in the template](#whats-included-in-the-template)
  - [Extend the AI Assistant Bot template with more AI capabilities](#extend-the-ai-assistant-bot-template-with-more-ai-capabilities)
  - [Additional information and references](#additional-information-and-references)

## Get started with the AI Assistant Bot template

> **Prerequisites**
>
> To run the AI Assistant Bot template in your local dev machine, you will need:
>
> - [Node.js](https://nodejs.org/), supported versions: 16, 18
{{^enableTestToolByDefault}}
> - A [Microsoft 365 account for development](https://docs.microsoft.com/microsoftteams/platform/toolkit/accounts)
{{/enableTestToolByDefault}}
> - [Teams Toolkit Visual Studio Code Extension](https://aka.ms/teams-toolkit) version 5.0.0 and higher or [Teams Toolkit CLI](https://aka.ms/teamsfx-toolkit-cli)
> - An account with [OpenAI](https://platform.openai.com/).
>
> **Note**
>
> The `AssistantsPlanner` in Teams AI Library is currently in preview version.

### Create your own OpenAI Assistant

Before running or debugging your bot, please follow these steps to setup your own [OpenAI Assistant](https://platform.openai.com/docs/assistants/overview).

**If you haven't setup any Assistant yet**

> This app template provides script `src/creator.ts` to help create assistant. You can change the instructions and settings in the script to customize the assistant.
> 
> After creation, you can change and manage your assistants on [OpenAI](https://platform.openai.com/assistants).

1. Open terminal and run command `npm install` to install all dependency packages

   ```
   > npm install
   ```
1. After `npm install` completed, run command `npm run assistant:create -- <your-openai-api-key>`
   ```
   > npm run assistant:create -- xxxxxx
   ```
1. The above command will output something like "*Created a new assistant with an ID of: **asst_xxx...***"
1. Fill in both OpenAI API Key and the created Assistant ID into `env/.env.*.user`
   ```
   SECRET_OPENAI_API_KEY=<your-openai-api-key>
   SECRET_OPENAI_ASSISTANT_ID=<your-openai-assistant-id>
   ```

**If you already have an Assistant created**

1. Fill in both OpenAI API Key and the created Assistant ID into `env/.env.*.user`
   ```
   SECRET_OPENAI_API_KEY=<your-openai-api-key>
   SECRET_OPENAI_ASSISTANT_ID=<your-openai-assistant-id>
   ```

### Run Teams Bot locally

1. First, select the Teams Toolkit icon on the left in the VS Code toolbar.
{{#enableTestToolByDefault}}
1. Press F5 to start debugging which launches your app in Teams App Test Tool using a web browser. Select `Debug in Test Tool (Preview)`.
1. You can send any message to get a response from the bot.

**Congratulations**! You are running an application that can now interact with users in Teams App Test Tool:

![ai assistant bot in Teams App Test Tool](https://github.com/OfficeDev/TeamsFx/assets/37978464/e3b458f3-5e74-460d-9df2-bf77ed8d9c54)
{{/enableTestToolByDefault}}
{{^enableTestToolByDefault}}
1. In the Account section, sign in with your [Microsoft 365 account](https://docs.microsoft.com/microsoftteams/platform/toolkit/accounts) if you haven't yet.
1. Press F5 to start debugging which launches your app in Teams using a web browser. Select `Debug in Teams (Edge)` or `Debug in Teams (Chrome)`.
1. When Teams launches in the browser, select the Add button in the dialog to install your app to Teams.
1. You can send any message to get a response from the bot.

**Congratulations**! You are running an application that can now interact with users in Teams:

![ai assistant bot in Teams](https://github.com/OfficeDev/TeamsFx/assets/37978464/ccff0457-726a-486b-9247-c7f53e0a80ab)
{{/enableTestToolByDefault}}

## What's included in the template

| Folder       | Contents                                            |
| - | - |
| `.vscode`    | VSCode files for debugging                          |
| `appPackage` | Templates for the Teams application manifest        |
| `env`        | Environment files                                   |
| `infra`      | Templates for provisioning Azure resources          |
| `src`        | The source code for the application                 |

The following files can be customized and demonstrate an example implementation to get you started.

| File                                 | Contents                                           |
| - | - |
|`src/index.ts`| Sets up the bot app server.|
|`src/adapter.ts`| Sets up the bot adapter.|
|`src/config.ts`| Defines the environment variables.|
|`src/creator.ts`| One-time tool to create OpenAI Assistant.|
|`src/app/app.ts`| Handles business logics for the AI Assistant Bot.|
|`src/app/messages.ts`| Defines the message activity handlers.|
|`src/app/actions.ts`| Defines the AI actions.|

The following are Teams Toolkit specific project files. You can [visit a complete guide on Github](https://github.com/OfficeDev/TeamsFx/wiki/Teams-Toolkit-Visual-Studio-Code-v5-Guide#overview) to understand how Teams Toolkit works.

| File                                 | Contents                                           |
| - | - |
|`teamsapp.yml`|This is the main Teams Toolkit project file. The project file defines two primary things:  Properties and configuration Stage definitions. |
|`teamsapp.local.yml`|This overrides `teamsapp.yml` with actions that enable local execution and debugging.|
|`teamsapp.testtool.yml`|This overrides `teamsapp.yml` with actions that enable local execution and debugging in Teams App Test Tool.|

## Extend the AI Assistant Bot template with more AI capabilities

You can follow [AI assistant bot in Teams](https://aka.ms/teamsfx-ai-assistant-bot) to extend the AI Assistant Bot template with more AI capabilities.

## Additional information and references
- [Teams AI library](https://aka.ms/teams-ai-library)
- [Teams Toolkit Documentations](https://docs.microsoft.com/microsoftteams/platform/toolkit/teams-toolkit-fundamentals)
- [Teams Toolkit CLI](https://aka.ms/teamsfx-toolkit-cli)
- [Teams Toolkit Samples](https://github.com/OfficeDev/TeamsFx-Samples)
- [OpenAI Assistants API](https://platform.openai.com/docs/assistants/overview)