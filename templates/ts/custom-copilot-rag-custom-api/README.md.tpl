# Overview of the Custom Copilot from Custom API template

This template showcases an AI-powered intelligent chatbot that can understand natural language to invoke the API defined in the OpenAPI description document.

The app template is built using the Teams AI library, which provides the capabilities to build AI-based Teams applications.
 
- [Overview of the Custom Copilot from Custom API template](#overview-of-the-basic-ai-chatbot-template)
  - [Get started with the Custom Copilot from Custom API template](#get-started-with-the-basic-ai-chatbot-template)
  - [What's included in the template](#whats-included-in-the-template)
  - [Extend the Custom Copilot from Custom API template with more APIs](#extend-the-custom-copilot-from-custom-api-template-with-more-apis)
  - [Additional information and references](#additional-information-and-references)

## Get started with the Custom Copilot from Custom API template

> **Prerequisites**
>
> To run the Custom Copilot from Custom API template in your local dev machine, you will need:
>
> - [Node.js](https://nodejs.org/), supported versions: 16, 18
{{^enableTestToolByDefault}}
> - A [Microsoft 365 account for development](https://docs.microsoft.com/microsoftteams/platform/toolkit/accounts)
{{/enableTestToolByDefault}}
> - [Teams Toolkit Visual Studio Code Extension](https://aka.ms/teams-toolkit) version 5.0.0 and higher or [Teams Toolkit CLI](https://aka.ms/teamsfx-toolkit-cli)
{{#useOpenAI}}
> - An account with [OpenAI](https://platform.openai.com/)
{{/useOpenAI}}
{{#useAzureOpenAI}}
> - Prepare your own [Azure OpenAI](https://aka.ms/oai/access) resource.
{{/useAzureOpenAI}}

1. First, select the Teams Toolkit icon on the left in the VS Code toolbar.
{{#enableTestToolByDefault}}
{{#useOpenAI}}
1. In file *env/.env.testtool.user*, fill in your OpenAI key `SECRET_OPENAI_API_KEY=<your-key>`.
{{/useOpenAI}}
{{#useAzureOpenAI}}
1. In file *env/.env.testtool.user*, fill in your Azure OpenAI key `SECRET_AZURE_OPENAI_ENDPOINT=<your-key>`, endpoint `SECRET_AZURE_OPENAI_ENDPOINT=<your-endpoint>` and deployment name `AZURE_OPENAI_MODEL_DEPLOYMENT_NAME=<your-deployment-name>`.
{{/useAzureOpenAI}}
1. Press F5 to start debugging which launches your app in Teams App Test Tool using a web browser. Select `Debug in Test Tool (Preview)`.
1. You can send any message to get a response from the bot.

**Congratulations**! You are running an application that can now interact with users in Teams App Test Tool:

![custom api template](https://github.com/OfficeDev/TeamsFx/assets/63089166/81f985a1-b81d-4c27-a82a-73a9b65ece1f)
{{/enableTestToolByDefault}}
{{^enableTestToolByDefault}}
1. In the Account section, sign in with your [Microsoft 365 account](https://docs.microsoft.com/microsoftteams/platform/toolkit/accounts) if you haven't yet.
{{#useOpenAI}}
1. In file *env/.env.local.user*, fill in your OpenAI key `SECRET_OPENAI_API_KEY=<your-key>`.
{{/useOpenAI}}
{{#useAzureOpenAI}}
1. In file *env/.env.local.user*, fill in your Azure OpenAI key `SECRET_AZURE_OPENAI_ENDPOINT=<your-key>`, endpoint `SECRET_AZURE_OPENAI_ENDPOINT=<your-endpoint> and deployment name `AZURE_OPENAI_MODEL_DEPLOYMENT_NAME=<your-deployment-name>`.
{{/useAzureOpenAI}}
1. Press F5 to start debugging which launches your app in Teams using a web browser. Select `Debug in Teams (Edge)` or `Debug in Teams (Chrome)`.
1. When Teams launches in the browser, select the Add button in the dialog to install your app to Teams.
1. You can send any message to get a response from the bot.

**Congratulations**! You are running an application that can now interact with users in Teams:

![custom api template](https://github.com/OfficeDev/TeamsFx/assets/63089166/19f4c825-c296-4d29-a957-bedb88b6aa5b)
{{/enableTestToolByDefault}}

## What's included in the template

| Folder       | Contents                                            |
| - | - |
| `.vscode`    | VSCode files for debugging                          |
| `appPackage` | Templates for the Teams application manifest        |
| `appPackage/apiSpecificationFile` | Generated API spec file        |
| `env`        | Environment files                                   |
| `infra`      | Templates for provisioning Azure resources          |
| `src`        | The source code for the application                 |

The following files can be customized and demonstrate an example implementation to get you started.

| File                                 | Contents                                           |
| - | - |
|`src/index.js`| Sets up the bot app server.|
|`src/adapter.js`| Sets up the bot adapter.|
|`src/config.js`| Defines the environment variables.|
|`src/prompts/chat/skprompt.txt`| Defines the prompt.|
|`src/prompts/chat/config.json`| Configures the prompt.|
|`src.primpts/chat/actions.json`| List of available actions.| 
|`src/app/app.js`| Handles business logics for the AI bot.|
|`src/app/utility.js`| Utility methods for the AI bot.|

The following are Teams Toolkit specific project files. You can [visit a complete guide on Github](https://github.com/OfficeDev/TeamsFx/wiki/Teams-Toolkit-Visual-Studio-Code-v5-Guide#overview) to understand how Teams Toolkit works.

| File                                 | Contents                                           |
| - | - |
|`teamsapp.yml`|This is the main Teams Toolkit project file. The project file defines two primary things:  Properties and configuration Stage definitions. |
|`teamsapp.local.yml`|This overrides `teamsapp.yml` with actions that enable local execution and debugging.|
|`teamsapp.testtool.yml`| This overrides `teamsapp.yml` with actions that enable local execution and debugging in Teams App Test Tool.|

## Extend the Custom Copilot from Custom API template with more APIs

You can follow the following steps to extend the Custom Copilot from Custom API template with more APIs.

1. Update `./appPackage/apiSpecificationFile/openapi.*`

    Copy corresponding part of the API you want to add from your spec, and append to `./appPackage/apiSpecificationFile/openapi.*`.

1. Update `./src/prompts/chat/actions.json`

    Fill necessary info and properties for path, query and/or body for the API in the following object, and add it in the array in `./src/prompts/chat/actions.json`.
    ```
    {
      "name": "${{YOUR-API-NAME}}",
      "description": "${{YOUR-API-DESCRIPTION}}",
      "parameters": {
        "type": "object",
        "properties": {
          "query": {
            "type": "object",
            "properties": {
              "${{YOUR-PROPERTY-NAME}}": {
                "type": "${{YOUR-PROPERTY-TYPE}}",
                "description": "${{YOUR-PROPERTY-DESCRIPTION}}",
              }
              // You can add more query properties here
            }
          },
          "path": {
            // Same as query properties
          },
          "body": {
            // Same as query properties
          }
        }
      }
    }
    ```

1. Update `./src/adaptiveCards`

    Create a new file with name `${{YOUR-API-NAME}}.json`, and fill in the adaptive card for the API response of your API.

1. Update `./src/app/app.ts`

    Add following code before `export default app;`. Remember to replace necessary info.

    ```
    app.ai.action(${{YOUR-API-NAME}}, async (context: TurnContext, state: ApplicationTurnState, parameter: any) => {
      const client = await api.getClient();
      
      const path = client.paths[${{YOUR-API-PATH}}];
      if (path && path.${{YOUR-API-METHOD}}) {
        const result = await path.${{YOUR-API-METHOD}}(parameter.path, parameter.body, {
          params: parameter.query,
        });
        const card = generateAdaptiveCard("../adaptiveCards/${{YOUR-API-NAME}}.json", result);
        await context.sendActivity({ attachments: [card] });
      } else {
        await context.sendActivity("no result");
      }
      return "result";
    });
    ```

1. Run `Local Debug` or `Provision` and `Deploy` to run this app again.

## Additional information and references
- [Teams AI library](https://aka.ms/teams-ai-library)
- [Teams Toolkit Documentations](https://docs.microsoft.com/microsoftteams/platform/toolkit/teams-toolkit-fundamentals)
- [Teams Toolkit CLI](https://aka.ms/teamsfx-toolkit-cli)
- [Teams Toolkit Samples](https://github.com/OfficeDev/TeamsFx-Samples)