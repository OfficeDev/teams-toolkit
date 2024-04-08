# Overview of the AI Search Bot template

This app template is built on top of [Teams AI library](https://aka.ms/teams-ai-library).
It showcases how to build an basic RAG bot in Teams capable of chatting with users but with context provided by Azure AI Search data source.

- [Overview of the AI Search Bot template](#overview-of-the-ai-search-bot-template)
  - [Get started with the AI Search Bot template](#get-started-with-the-ai-search-bot-template)
  - [What's included in the template](#whats-included-in-the-template)
  - [Extend the AI Search Bot template with more AI capabilities](#extend-the-ai-search-bot-template-with-more-ai-capabilities)
  - [Additional information and references](#additional-information-and-references)

## Get started with the AI Search Bot template

> **Prerequisites**
>
> To run the AI Search bot template in your local dev machine, you will need:
>
> - [Node.js](https://nodejs.org/), supported versions: 16, 18
> - [Teams Toolkit Visual Studio Code Extension](https://aka.ms/teams-toolkit) version 5.0.0 and higher or [Teams Toolkit CLI](https://aka.ms/teamsfx-toolkit-cli)
{{#useOpenAI}}
> - An account with [OpenAI](https://platform.openai.com/) and [Azure AI Search](https://azure.microsoft.com/en-us/products/ai-services/ai-search).
{{/useOpenAI}}
{{#useAzureOpenAI}}
> - Prepare your own [Azure OpenAI](https://aka.ms/oai/access) resource and [Azure AI Search](https://azure.microsoft.com/en-us/products/ai-services/ai-search).
{{/useAzureOpenAI}}

1. First, select the Teams Toolkit icon on the left in the VS Code toolbar.
{{#useOpenAI}}
1. In file *env/.env.testtool.user*, fill in your OpenAI key `SECRET_OPENAI_API_KEY=<your-key>`. And fill in your Azure AI search key `SECRET_AZURE_SEARCH_KEY=<your--ai-search-key>` and endpoint `AZURE_SEARCH_ENDPOINT=<your-ai-search-endpoint>`.
{{/useOpenAI}}
{{#useAzureOpenAI}}
1. In file *env/.env.testtool.user*, fill in your Azure OpenAI key `SECRET_AZURE_OPENAI_API_KEY=<your-key>`, endpoint `AZURE_OPENAI_ENDPOINT=<your-endpoint>`, deployment name `AZURE_OPENAI_DEPLOYMENT_NAME=<your-deployment>`, and embedding deployment name `AZURE_OPENAI_EMBEDDING_DEPLOYMENT_NAME=<your-embedding-deployment>`. And fill in your Azure AI search key `SECRET_AZURE_SEARCH_KEY=<your-ai-search-key>` and endpoint `AZURE_SEARCH_ENDPOINT=<your-ai-search-endpoint>`.
{{/useAzureOpenAI}}
1. Do `npm install` and `npm run indexer:create` to create the my documents index. Once you're done using the sample it's good practice to delete the index. You can do so with the `npm run indexer:delete` command.
1. Press F5 to start debugging which launches your app in Teams App Test Tool using a web browser. Select `Debug in Test Tool (Preview)`.
1. You can send any message to get a response from the bot.

**Congratulations**! You are running an application that can now interact with users in Teams App Test Tool:

![AI Search Bot](https://github.com/OfficeDev/TeamsFx/assets/13211513/f56e7602-a5d3-436a-ae01-78546d61717d)

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
|`src/prompts/chat/skprompt.txt`| Defines the prompt.|
|`src/prompts/chat/config.json`| Configures the prompt.|
|`src/app/app.ts`| Handles business logics for the RAG bot.|
|`src/app/azureAISearchDataSource.ts`| Defines the Azure AI search data source.|
|`src/indexers/data/*.md`| Raw text data sources.|
|`src/indexers/utils.ts`| Basic index tools. |
|`src/indexers/setup.ts`| A script to create index and upload documents. |
|`src/indexers/delete.ts`| A script to delete index and documents. |

The following are Teams Toolkit specific project files. You can [visit a complete guide on Github](https://github.com/OfficeDev/TeamsFx/wiki/Teams-Toolkit-Visual-Studio-Code-v5-Guide#overview) to understand how Teams Toolkit works.

| File                                 | Contents                                           |
| - | - |
|`teamsapp.yml`|This is the main Teams Toolkit project file. The project file defines two primary things:  Properties and configuration Stage definitions. |
|`teamsapp.local.yml`|This overrides `teamsapp.yml` with actions that enable local execution and debugging.|
|`teamsapp.testtool.yml`| This overrides `teamsapp.yml` with actions that enable local execution and debugging in Teams App Test Tool.|

## Extend the AI Search bot template with more AI capabilities

You can follow [Build a Basic AI Chatbot in Teams](https://aka.ms/teamsfx-basic-ai-chatbot) to extend the Basic AI Chatbot template with more AI capabilities, like:
- [Customize prompt](https://aka.ms/teamsfx-basic-ai-chatbot#customize-prompt)
- [Customize user input](https://aka.ms/teamsfx-basic-ai-chatbot#customize-user-input)
- [Customize conversation history](https://aka.ms/teamsfx-basic-ai-chatbot#customize-conversation-history)
- [Customize model type](https://aka.ms/teamsfx-basic-ai-chatbot#customize-model-type)
- [Customize model parameters](https://aka.ms/teamsfx-basic-ai-chatbot#customize-model-parameters)
- [Handle messages with image](https://aka.ms/teamsfx-basic-ai-chatbot#handle-messages-with-image)

## Additional information and references
- [Teams AI library](https://aka.ms/teams-ai-library)
- [Teams Toolkit Documentations](https://docs.microsoft.com/microsoftteams/platform/toolkit/teams-toolkit-fundamentals)
- [Teams Toolkit CLI](https://aka.ms/teamsfx-toolkit-cli)
- [Teams Toolkit Samples](https://github.com/OfficeDev/TeamsFx-Samples)