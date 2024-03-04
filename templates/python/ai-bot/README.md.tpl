# Overview of the AI Chat Bot template

This template showcases a bot app that responds to user questions like an AI assistant. This enables your users to talk with the AI assistant in Teams to find information.

The app template is built using the Teams AI library, which provides the capabilities to build AI-based Teams applications.

- [Overview of the AI Chat Bot template](#overview-of-the-ai-chat-bot-template)
  - [Get started with the AI Chat Bot template](#get-started-with-the-ai-chat-bot-template)
    - [Use OpenAI](#use-openai)
  - [What's included in the template](#whats-included-in-the-template)
  - [Extend the AI Chat Bot template with more AI capabilities](#extend-the-ai-chat-bot-template-with-more-ai-capabilities)
  - [Additional information and references](#additional-information-and-references)

## Get started with the AI Chat Bot template

> **Prerequisites**
>
> To run the AI Chat Bot template in your local dev machine, you will need:
>
> - [Python](https://www.python.org/), version 3.11 or higher
> - [Python extension](https://code.visualstudio.com/docs/languages/python), version v2024.0.1 or higher
> - [Teams Toolkit Visual Studio Code Extension](https://aka.ms/teams-toolkit) version 5.0.0 and higher or [Teams Toolkit CLI](https://aka.ms/teamsfx-cli)
> - An account with [Azure OpenAI](https://aka.ms/oai/access) or [OpenAI](https://platform.openai.com/).
{{^enableTestToolByDefault}}
> - A [Microsoft 365 account for development](https://docs.microsoft.com/microsoftteams/platform/toolkit/accounts)
{{/enableTestToolByDefault}}
{{#enableTestToolByDefault}}
> - [Node.js](https://nodejs.org/) (supported versions: 16, 18) for local debug in Test Tool.
{{/enableTestToolByDefault}}

1. First, Press **CTRL+Shift+P** to open the command box and enter `Python: Create Environment` to create and activate your desired virtual environment. Remember to select `requirements.txt` as dependencies to install when creating the virtual environment.
1. select the Teams Toolkit icon on the left in the VS Code toolbar.
{{#enableTestToolByDefault}}
1. In file *env/.env.testtool.user*, fill in your OpenAI key `SECRET_OPENAI_API_KEY=<your-key>`, deployment name `SECRET_OPENAI_MODEL_DEPLOYMENT_NAME=<your-deployment-name>` and endpoint `SECRET_AZURE_OPENAI_ENDPOINT`.
1. Press F5 to start debugging which launches your app in Teams App Test Tool using a web browser. Select `Debug in Test Tool (Preview)`.
1. You will receive a welcome message from the bot, or send any message to get a response.

**Congratulations**! You are running an application that can now interact with users in Teams App Test Tool:

![ai chat bot](https://github.com/OfficeDev/TeamsFx/assets/9698542/9bd22201-8fda-4252-a0b3-79531c963e5e)
{{/enableTestToolByDefault}}
{{^enableTestToolByDefault}}
1. In the Account section, sign in with your [Microsoft 365 account](https://docs.microsoft.com/microsoftteams/platform/toolkit/accounts) if you haven't already.
1. In file *env/.env.local.user*, fill in your OpenAI key `SECRET_OPENAI_API_KEY=<your-key>`, deployment name `SECRET_OPENAI_MODEL_DEPLOYMENT_NAME=<your-deployment-name>` and endpoint `SECRET_AZURE_OPENAI_ENDPOINT`.
1. Press F5 to start debugging which launches your app in Teams using a web browser. Select `Debug in Teams (Edge)` or `Debug in Teams (Chrome)`.
1. When Teams launches in the browser, select the Add button in the dialog to install your app to Teams.
1. You will receive a welcome message from the bot, or send any message to get a response.

**Congratulations**! You are running an application that can now interact with users in Teams:

![ai chat bot](https://user-images.githubusercontent.com/7642967/258726187-8306610b-579e-4301-872b-1b5e85141eff.png)
{{/enableTestToolByDefault}}

### Use OpenAI

Above steps use Azure OpenAI as AI service, optionally, you can also use OpenAI as AI service.

> **Prerequisites**
>
> - Prepare your own [OpenAI](https://platform.openai.com/) resource.

{{#enableTestToolByDefault}}
1. In file *env/.env.testtool.user*, fill in your Azure OpenAI key `SECRET_OPENAI_API_KEY=<your-key>` and deployment name `SECRET_OPENAI_MODEL_DEPLOYMENT_NAME=<your-deployment-name>`.
{{/enableTestToolByDefault}}
{{^enableTestToolByDefault}}
1. In file *env/.env.local.user*, fill in your Azure OpenAI key `SECRET_OPENAI_API_KEY=<your-key>` and deployment name `SECRET_OPENAI_MODEL_DEPLOYMENT_NAME=<your-deployment-name>`.
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
|`src/api.py`| Host a Flask api server for the app.|
|`src/bot.py`| Handles business logics for the AI Chat Bot.|
|`src/config.py`| Defines the environment variables.|
|`src/app.py`| Main module of the AI Chat Bot.|
|`src/prompts/chat/skprompt.txt`| Defines the prompt.|
|`src/prompts/chat/config.json`| Configures the prompt.|

The following are Teams Toolkit specific project files. You can [visit a complete guide on Github](https://github.com/OfficeDev/TeamsFx/wiki/Teams-Toolkit-Visual-Studio-Code-v5-Guide#overview) to understand how Teams Toolkit works.

| File                                 | Contents                                           |
| - | - |
|`teamsapp.yml`|This is the main Teams Toolkit project file. The project file defines two primary things:  Properties and configuration Stage definitions. |
|`teamsapp.local.yml`|This overrides `teamsapp.yml` with actions that enable local execution and debugging.|
|`teamsapp.testtool.yml`|This overrides `teamsapp.yml` with actions that enable local execution and debugging in Teams App Test Tool.|

## Extend the AI Chat Bot template with more AI capabilities

You can follow [Get started with Teams AI library](https://learn.microsoft.com/en-us/microsoftteams/platform/bots/how-to/teams%20conversational%20ai/how-conversation-ai-get-started) to extend the AI Chat Bot template with more AI capabilities.

## Additional information and references
- [Teams AI library](https://aka.ms/teams-ai-library)
- [Teams Toolkit Documentations](https://docs.microsoft.com/microsoftteams/platform/toolkit/teams-toolkit-fundamentals)
- [Teams Toolkit CLI](https://aka.ms/teamsfx-toolkit-cli)
- [Teams Toolkit Samples](https://github.com/OfficeDev/TeamsFx-Samples)