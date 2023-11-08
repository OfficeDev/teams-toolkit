# Overview of the AI Assistant Bot template

This template showcases an AI assistant bot app that users can talk in Teams to find information.

The app template is built using the Teams AI library and OpenAI Assistants API, which provides the capabilities to build AI-based Teams applications.

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
> - [Teams Toolkit Visual Studio Code Extension](https://aka.ms/teams-toolkit) version 5.0.0 and higher or [Teams Toolkit CLI](https://aka.ms/teamsfx-cli)
> - An account with [OpenAI](https://platform.openai.com/).
>
> **Note**
>
> Teams AI Library is currently in preview version.

### Create your own OpenAI Assistant
TBD

### Run Teams Bot locally
TBD

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
|`src/index.js`| Sets up and configures the AI Assistant Bot.|
|`src/app.js`| Handles business logics for the AI Assistant Bot.|
|`src/config.js`| Defines the environment variables.|
|`src/creator.js`| One-time tool to create OpenAI Assistant.|

The following are Teams Toolkit specific project files. You can [visit a complete guide on Github](https://github.com/OfficeDev/TeamsFx/wiki/Teams-Toolkit-Visual-Studio-Code-v5-Guide#overview) to understand how Teams Toolkit works.

| File                                 | Contents                                           |
| - | - |
|`teamsapp.yml`|This is the main Teams Toolkit project file. The project file defines two primary things:  Properties and configuration Stage definitions. |
|`teamsapp.local.yml`|This overrides `teamsapp.yml` with actions that enable local execution and debugging.|
|`teamsapp.testtool.yml`|This overrides `teamsapp.yml` with actions that enable local execution and debugging in Teams App Test Tool.|

## Extend the AI Assistant Bot template with more AI capabilities

You can follow [Get started with Teams AI library](https://learn.microsoft.com/en-us/microsoftteams/platform/bots/how-to/teams%20conversational%20ai/how-conversation-ai-get-started) to extend the AI Assistant Bot template with more AI capabilities.

## Additional information and references
- [Teams AI library](https://aka.ms/teams-ai-library)
- [Teams Toolkit Documentations](https://docs.microsoft.com/microsoftteams/platform/toolkit/teams-toolkit-fundamentals)
- [Teams Toolkit CLI](https://docs.microsoft.com/microsoftteams/platform/toolkit/teamsfx-cli)
- [Teams Toolkit Samples](https://github.com/OfficeDev/TeamsFx-Samples)
- [OpenAI Assistants API](https://platform.openai.com/docs/assistants/overview)