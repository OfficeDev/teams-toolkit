# Overview of the AI Chat Bot template

This template showcases a bot app that responds to user questions like an AI assistant. This enables your users to talk with the AI assistant in Teams to find information.

The app template is built using the Teams AI library, which provides the capabilities to build AI-based Teams applications.

## Get started with the AI Chat Bot template

> **Prerequisites**
>
> To run the AI Chat Bot template in your local dev machine, you will need:
>
> - [Node.js](https://nodejs.org/), supported versions: 16, 18
> - A [Microsoft 365 account for development](https://docs.microsoft.com/microsoftteams/platform/toolkit/accounts)
> - [Teams Toolkit Visual Studio Code Extension](https://aka.ms/teams-toolkit) version 5.0.0 and higher or [Teams Toolkit CLI](https://aka.ms/teamsfx-cli)
> - An account with [OpenAI](https://platform.openai.com/).

1. First, select the Teams Toolkit icon on the left in the VS Code toolbar.
1. In the Account section, sign in with your [Microsoft 365 account](https://docs.microsoft.com/microsoftteams/platform/toolkit/accounts) if you haven't already.
1. In file *env/.env.local.user*, fill in your OpenAI key `SECRET_OPENAI_API_KEY=<your-key>`.
1. Press F5 to start debugging which launches your app in Teams using a web browser. Select `Debug (Edge)` or `Debug (Chrome)`.
1. When Teams launches in the browser, select the Add button in the dialog to install your app to Teams.
1. You will receive a welcome message from the bot, or send any message to get a response.

**Congratulations**! You are running an application that can now interact with users in Teams:

![ai chat bot](https://user-images.githubusercontent.com/7642967/258726187-8306610b-579e-4301-872b-1b5e85141eff.png)

### Use Azure OpenAI

Above steps use OpenAI as AI service, optionally, you can also use Azure OpenAI as AI service.

> **Prerequisites**
>
> - Prepare your own [Azure OpenAI](https://aka.ms/oai/access) resource.

1. In file *env/.env.local.user*, fill in your Azure OpenAI key `SECRET_AZURE_OPENAI_API_KEY=<your-key>` and endpoint `SECRET_AZURE_OPENAI_ENDPOINT=<your-endpoint>`.
1. In `teamsapp.local.yml`, comment out `OPENAI_API_KEY` from `file/createOrUpdateEnvironmentFile` action, and uncomment `AZURE_OPENAI_API_KEY` and `AZURE_OPENAI_ENDPOINT`, e.g.
    ```yaml
    # Generate runtime environment variables
    - uses: file/createOrUpdateEnvironmentFile
      with:
        target: ./.localConfigs
        envs:
          BOT_ID: ${{BOT_ID}}
          BOT_PASSWORD: ${{SECRET_BOT_PASSWORD}}
          # OPENAI_API_KEY: ${{SECRET_OPENAI_API_KEY}}
          AZURE_OPENAI_API_KEY: ${{SECRET_AZURE_OPENAI_API_KEY}}
          AZURE_OPENAI_ENDPOINT: ${{SECRET_AZURE_OPENAI_ENDPOINT}}
    ```
1. In `src/app.ts`, comment out *"Use OpenAI"* part and uncomment *"use Azure OpenAI"* part, e.g.
    ```typescript
    // Use OpenAI
    /**
    const planner = new OpenAIPlanner({
      apiKey: config.openAIKey,
      defaultModel: "gpt-3.5-turbo",
      useSystemMessage: true,
      logRequests: true
    });
    */
    // Uncomment the following lines to use Azure OpenAI
    const planner = new AzureOpenAIPlanner({
      apiKey: config.azureOpenAIKey,
      endpoint: config.azureOpenAIEndpoint,
      defaultModel: "gpt-35-turbo",
      useSystemMessage: true,
      logRequests: true,
    });
    ```

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
|`src/index.ts`| Sets up and configures the AI Chat Bot.|
|`src/app.ts`| Handles business logics for the AI Chat Bot.|
|`src/config.ts`| Defines the environment variables.|
|`src/prompts/chat/skprompt.txt`| Defines the prompt.|
|`src/prompts/chat/config.json`| Configures the prompt.|

The following are Teams Toolkit specific project files. You can [visit a complete guide on Github](https://github.com/OfficeDev/TeamsFx/wiki/Teams-Toolkit-Visual-Studio-Code-v5-Guide#overview) to understand how Teams Toolkit works.

| File                                 | Contents                                           |
| - | - |
|`teamsapp.yml`|This is the main Teams Toolkit project file. The project file defines two primary things:  Properties and configuration Stage definitions. |
|`teamsapp.local.yml`|This overrides `teamsapp.yml` with actions that enable local execution and debugging.|

## Extend the AI Chat Bot template with more AI capabilities

You can follow [Get started with Teams AI library](https://learn.microsoft.com/en-us/microsoftteams/platform/bots/how-to/teams%20conversational%20ai/how-conversation-ai-get-started) to extend the AI Chat Bot template with more AI capabilities.

## Additional information and references
- [Teams AI library](https://aka.ms/teams-ai-library)
- [Teams Toolkit Documentations](https://docs.microsoft.com/microsoftteams/platform/toolkit/teams-toolkit-fundamentals)
- [Teams Toolkit CLI](https://docs.microsoft.com/microsoftteams/platform/toolkit/teamsfx-cli)
- [Teams Toolkit Samples](https://github.com/OfficeDev/TeamsFx-Samples)