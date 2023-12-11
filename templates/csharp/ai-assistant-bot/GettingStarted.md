# Overview of the AI Assistant Bot template

This app template is built on top of [Teams AI library](https://aka.ms/teams-ai-library) and [OpenAI Assistants API](https://platform.openai.com/docs/assistants/overview).
It showcases how to build an intelligent chat bot in Teams capable of helping users accomplish a specific task using natural language right in the Teams conversations, such as solving a math problem.

## Quick Start

**Prerequisites**
> To run the AI Assistant Bot template in your local dev machine, you will need:
>
> - An account with [OpenAI](https://platform.openai.com).
> 
> **Note**
>
> The `AssistantsPlanner` in `Microsoft.Teams.AI` is currently experimental.

### If you already have an Assistant created
1. Fill in both OpenAI API Key and the created Assistant ID into `env/.env.local.user`
   ```
   SECRET_OPENAI_API_KEY=<your-openai-api-key>
   SECRET_OPENAI_ASSISTANT_ID=<your-openai-assistant-id>
   ```
2. In the debug dropdown menu, select Dev Tunnels > Create A Tunnel (set authentication type to Public) or select an existing public dev tunnel
3. Right-click your project and select Teams Toolkit > Prepare Teams App Dependencies
4. If prompted, sign in with a Microsoft 365 account for the Teams organization you want 
to install the app to
5. Press F5, or select the Debug > Start Debugging menu in Visual Studio
6. In the launched browser, select the Add button to load the app in Teams
7. In the chat bar, type and send anything to your bot to trigger a response

### If you haven't setup any Assistant yet

Before running or debugging your bot, please follow these steps to setup your own [OpenAI Assistant](https://platform.openai.com/docs/assistants/overview).

> This app template provides code snippets in `Program.cs` to help create assistant. You can change the instructions and settings in the code snippets to customize the assistant.
> 
> After creation, you can change and manage your assistants on [OpenAI](https://platform.openai.com/assistants).

1. Fill in your OpenAI API Key into `env/.env.local.user`
   ```
   SECRET_OPENAI_API_KEY="<your-openai-api-key>"
   ```
2. In the debug dropdown menu, select Dev Tunnels > Create A Tunnel (set authentication type to Public) or select an existing public dev tunnel
3. Right-click your project and select Teams Toolkit > Prepare Teams App Dependencies
4. If prompted, sign in with a Microsoft 365 account for the Teams organization you want 
to install the app to
5. Press F5, or select the Debug > Start Debugging menu in Visual Studio
6. The debug window will output something like "*Created a new assistant with an ID of: **asst_xxx...***". Copy the Assistant ID and then follow [If you already have an Assistant created](#if-you-already-have-an-assistant-created)

## Extend the AI Assistant Bot template with more AI capabilities

You can follow [Get started with Teams AI library](https://learn.microsoft.com/en-us/microsoftteams/platform/bots/how-to/teams%20conversational%20ai/how-conversation-ai-get-started) to extend the AI Assistant Bot template with more AI capabilities.

## Additional information and references
- [Teams AI library](https://aka.ms/teams-ai-library)
- [Teams Toolkit Documentations](https://docs.microsoft.com/microsoftteams/platform/toolkit/teams-toolkit-fundamentals)
- [Teams Toolkit CLI](https://docs.microsoft.com/microsoftteams/platform/toolkit/teamsfx-cli)
- [Teams Toolkit Samples](https://github.com/OfficeDev/TeamsFx-Samples)

## Learn more

New to Teams app development or Teams Toolkit? Learn more about 
Teams app manifests, deploying to the cloud, and more in the documentation 
at https://aka.ms/teams-toolkit-vs-docs.

## Report an issue

Select Visual Studio > Help > Send Feedback > Report a Problem. 
Or, you can create an issue directly in our GitHub repository: 
https://github.com/OfficeDev/TeamsFx/issues.
