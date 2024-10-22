# Overview of the Chat With Your Data (Using Microsoft 365 Data) template

This app template showcases how to build one of the most powerful applications enabled by LLM - sophisticated question-answering (Q&A) chat bots that can answer questions about specific source information right in the Microsoft Teams.
This app template also demonstrates usage of techniques like: 
- [Retrieval Augmented Generation](https://python.langchain.com/docs/use_cases/question_answering/#what-is-rag), or RAG.
- [Microsoft Graph Search API](https://learn.microsoft.com/graph/search-concept-overview)
- [Teams AI Library](https://learn.microsoft.com/microsoftteams/platform/bots/how-to/teams%20conversational%20ai/teams-conversation-ai-overview)

## Quick Start

**Prerequisites**
> To run the AI Chat Bot template in your local dev machine, you will need:
>
{{#useOpenAI}}
> - an account with [OpenAI](https://platform.openai.com).
{{/useOpenAI}}
{{#useAzureOpenAI}}
> - [Azure OpenAI](https://aka.ms/oai/access) resource
{{/useAzureOpenAI}}

### Debug bot app in Teams Web Client
{{#useOpenAI}}
1. Ensure your OpenAI API Key is filled in `env/.env.local.user`.
    ```
    SECRET_OPENAI_API_KEY="<your-openai-api-key>"
    ```
{{/useOpenAI}}
{{#useAzureOpenAI}}
1. Ensure your Azure OpenAI settings are filled in `env/.env.local.user`.
    ```
    SECRET_AZURE_OPENAI_API_KEY="<your-azure-openai-api-key>"
    AZURE_OPENAI_ENDPOINT="<your-azure-openai-endpoint>"
    AZURE_OPENAI_DEPLOYMENT_NAME="<your-azure-openai-deployment-name>"
    ```
{{/useAzureOpenAI}}
1. Microsoft Graph Search API is available for searching SharePoint content, thus you just need to ensure your document in *src/data/\*.txt* is [uploaded to SharePoint / OneDrive](https://support.microsoft.com/office/upload-files-and-folders-to-a-library-da549fb1-1fcb-4167-87d0-4693e93cb7a0), no extra data ingestion required.
1. In the debug dropdown menu, select Dev Tunnels > Create A Tunnel (set authentication type to Public) or select an existing public dev tunnel.
1. Right-click your project and select Teams Toolkit > Prepare Teams App Dependencies.
1. If prompted, sign in with a Microsoft 365 account for the Teams organization you want to install the app to.
1. Press F5, or select the Debug > Start Debugging menu in Visual Studio.
1. In the launched browser, select the Add button to load the app in Teams.
1. In the chat bar, type and send anything to your bot to trigger a response.

![M365 RAG Bot](https://github.com/OfficeDev/TeamsFx/assets/13211513/c2fff68c-53ce-445a-a101-97f0c127b825)

> For local debugging using Teams Toolkit CLI, you need to do some extra steps described in [Set up your Teams Toolkit CLI for local debugging](https://aka.ms/teamsfx-cli-debugging).

## Extend the AI Chat Bot template with more AI capabilities

- You can follow [Get started with Teams AI library](https://learn.microsoft.com/en-us/microsoftteams/platform/bots/how-to/teams%20conversational%20ai/how-conversation-ai-get-started) to extend the AI Chat Bot template with more AI capabilities.
- Understand more about [how to add additional APIs](https://aka.ms/teamsfx-rag-bot#add-more-api-for-custom-api-as-data-source).

## Additional information and references
- [Teams AI library](https://aka.ms/teams-ai-library)
- [Teams Toolkit Documentations](https://docs.microsoft.com/microsoftteams/platform/toolkit/teams-toolkit-fundamentals)
- [Teams Toolkit CLI](https://aka.ms/teamsfx-toolkit-cli)
- [Teams Toolkit Samples](https://github.com/OfficeDev/TeamsFx-Samples)

## Learn more

New to Teams app development or Teams Toolkit? Learn more about 
Teams app manifests, deploying to the cloud, and more in the documentation 
at https://aka.ms/teams-toolkit-vs-docs.

## Report an issue

Select Visual Studio > Help > Send Feedback > Report a Problem. 
Or, you can create an issue directly in our GitHub repository: 
https://github.com/OfficeDev/TeamsFx/issues.
