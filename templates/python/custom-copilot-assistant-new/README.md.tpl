# Overview of the AI Agent template

This app template is built on top of [Teams AI library](https://aka.ms/teams-ai-library).
It showcases how to build an AI agent in Teams capable of chatting with users and helping users accomplish a specific task using natural language right in the Teams conversations, such as managing tasks.

## Get started with the template

> **Prerequisites**
>
> To run the template in your local dev machine, you will need:
>
> - [Python](https://www.python.org/), version 3.8 to 3.11.
> - [Python extension](https://code.visualstudio.com/docs/languages/python), version v2024.0.1 or higher.
> - [Teams Toolkit Visual Studio Code Extension](https://aka.ms/teams-toolkit) latest version or [Teams Toolkit CLI](https://aka.ms/teamsfx-cli).
{{#useAzureOpenAI}}
> - An account with [Azure OpenAI](https://aka.ms/oai/access).
{{/useAzureOpenAI}}
{{#useOpenAI}}
> - An account with [OpenAI](https://platform.openai.com/).
{{/useOpenAI}}
{{^enableTestToolByDefault}}
> - A [Microsoft 365 account for development](https://docs.microsoft.com/microsoftteams/platform/toolkit/accounts).
{{/enableTestToolByDefault}}
{{#enableTestToolByDefault}}
> - [Node.js](https://nodejs.org/) (supported versions: 16, 18) for local debug in Test Tool.
{{/enableTestToolByDefault}}

### Configurations
1. Open the command box and enter `Python: Create Environment` to create and activate your desired virtual environment. Remember to select `src/requirements.txt` as dependencies to install when creating the virtual environment.
{{#enableTestToolByDefault}}
{{#useAzureOpenAI}}
1. In file *env/.env.testtool.user*, fill in your Azure OpenAI key `SECRET_AZURE_OPENAI_API_KEY`, deployment name `AZURE_OPENAI_MODEL_DEPLOYMENT_NAME` and endpoint `AZURE_OPENAI_ENDPOINT`.
{{/useAzureOpenAI}}
{{#useOpenAI}}
1. In file *env/.env.testtool.user*, fill in your OpenAI key `SECRET_OPENAI_API_KEY`. 
1. In this template, default model name is `gpt-3.5-turbo`. If you want to use a different model from OpenAI, fill in your model name in [src/config.py](./src/config.py).
{{/useOpenAI}}
{{/enableTestToolByDefault}}
{{^enableTestToolByDefault}}
{{#useAzureOpenAI}}
1. In file *env/.env.local.user*, fill in your Azure OpenAI key `SECRET_AZURE_OPENAI_API_KEY`, deployment name `AZURE_OPENAI_MODEL_DEPLOYMENT_NAME` and endpoint `AZURE_OPENAI_ENDPOINT`.
{{/useAzureOpenAI}}
{{#useOpenAI}}
1. In file *env/.env.local.user*, fill in your OpenAI key `SECRET_OPENAI_API_KEY`. 
1. In this template, default model name is `gpt-3.5-turbo`. If you want to use a different model from OpenAI, fill in your model name in [src/config.py](./src/config.py).
{{/useOpenAI}}
{{/enableTestToolByDefault}}

### Conversation with bot
1. Select the Teams Toolkit icon on the left in the VS Code toolbar.
{{#enableTestToolByDefault}}
1. Press F5 to start debugging which launches your app in Teams App Test Tool using a web browser. Select `Debug in Test Tool`.
{{/enableTestToolByDefault}}
{{^enableTestToolByDefault}}
1. In the Account section, sign in with your [Microsoft 365 account](https://docs.microsoft.com/microsoftteams/platform/toolkit/accounts) if you haven't already.
1. Press F5 to start debugging which launches your app in Teams using a web browser. Select `Debug in Teams (Edge)` or `Debug in Teams (Chrome)`.
1. When Teams launches in the browser, select the Add button in the dialog to install your app to Teams.
{{/enableTestToolByDefault}}
1. You will receive a welcome message from the bot, or send any message to get a response.

**Congratulations**! You are running an application that can now interact with users in Teams:

> For local debugging using Teams Toolkit CLI, you need to do some extra steps described in [Set up your Teams Toolkit CLI for local debugging](https://aka.ms/teamsfx-cli-debugging).

{{#enableTestToolByDefault}}
![ai agent](https://github.com/OfficeDev/Microsoft-Teams-Samples/assets/109947924/6a362379-5c22-40d4-8087-9fc37bc96800)
{{/enableTestToolByDefault}}
{{^enableTestToolByDefault}}
![ai agent](https://github.com/OfficeDev/TeamsFx/assets/109947924/775a0fde-f2ba-4198-a94d-a43c598d6e9b)
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
|`src/app.py`| Hosts an aiohttp api server and exports an app module.|
|`src/bot.py`| Handles business logics for the AI Agent.|
|`src/config.py`| Defines the environment variables.|
|`src/state.py`| Defines the app state of AI Agent.|
|`src/prompts/planner/skprompt.txt`| Defines the prompt.|
|`src/prompts/planner/config.json`| Configures the prompt.|
|`src/prompts/planner/action.json`| Configures the actions.|

The following are Teams Toolkit specific project files. You can [visit a complete guide on Github](https://github.com/OfficeDev/TeamsFx/wiki/Teams-Toolkit-Visual-Studio-Code-v5-Guide#overview) to understand how Teams Toolkit works.

| File                                 | Contents                                           |
| - | - |
|`teamsapp.yml`|This is the main Teams Toolkit project file. The project file defines two primary things:  Properties and configuration Stage definitions. |
|`teamsapp.local.yml`|This overrides `teamsapp.yml` with actions that enable local execution and debugging.|
|`teamsapp.testtool.yml`|This overrides `teamsapp.yml` with actions that enable local execution and debugging in Teams App Test Tool.|

## Extend the template

You can follow [Build an AI Agent in Teams](https://aka.ms/teamsfx-ai-agent) to extend the AI Agent template with more AI capabilities, like:
- [Add functions](https://aka.ms/teamsfx-ai-agent#add-functions-build-new)

## Additional information and references

- [Teams Toolkit Documentations](https://docs.microsoft.com/microsoftteams/platform/toolkit/teams-toolkit-fundamentals)
- [Teams Toolkit CLI](https://aka.ms/teamsfx-toolkit-cli)
- [Teams Toolkit Samples](https://github.com/OfficeDev/TeamsFx-Samples)

## Known issue
- If you use `Debug in Test Tool` to local debug, you might get an error `InternalServiceError: connect ECONNREFUSED 127.0.0.1:3978` in Test Tool log. You can wait for Python launch console ready and then refresh the front end web page. 
- When you use `Launch Remote in Teams` to remote debug after deployment, you might loose interaction with your bot. This is because the remote service needs to restart. Please wait for several minutes to retry it.