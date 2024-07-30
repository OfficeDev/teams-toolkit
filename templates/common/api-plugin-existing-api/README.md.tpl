{{^DeclarativeCopilot}}
# Overview of the API Plugin template

## Build an API Plugin from OpenAPI description document

With Copilot extensibility, you can augment Copilot for Microsoft 365 with custom skills and organizational knowledge specific to your enterprise and users to enable truly spectacular AI scenarios. For example:

- Retrieve real-time information, for example, latest news coverage on a product launch.
- Retrieve knowledge-based information, for example, my team’s design files in Figma.

When you extend Copilot for Microsoft 365, you maximize the efficiency of your apps and data with AI, by:

- Enriching the data estate of your enterprise with industry-leading AI.
- Keeping your users in the flow of their work, start to finish.
- Inheriting world-class security, compliance, and privacy policies.
{{/DeclarativeCopilot}}
{{#DeclarativeCopilot}}
# Overview of the basic declarative copilot with API plugin template

## Build a basic declarative copilot with API plugin

With the declarative copilot, you can build a custom version of Copilot that can be used for specific scenarios, such as for specialized knowledge, implementing specific processes, or simply to save time by reusing a set of AI prompts. For example, a grocery shopping Copilot declarative copilot can be used to create a grocery list based on a meal plan that you send to Copilot.

You can extend declarative copilots using plugins to retrieve data and execute tasks on external systems. A declarative copilot can utilize multiple plugins at the same time.
{{/DeclarativeCopilot}}

## Get started with the template

> **Prerequisites**
>
> To run this app template in your local dev machine, you will need:
>
> - [Node.js](https://nodejs.org/), supported versions: 16, 18
> - A [Microsoft 365 account for development](https://docs.microsoft.com/microsoftteams/platform/toolkit/accounts).
> - [Teams Toolkit Visual Studio Code Extension](https://aka.ms/teams-toolkit) version 5.0.0 and higher or [Teams Toolkit CLI](https://aka.ms/teamsfx-toolkit-cli)
> - [Copilot for Microsoft 365 license](https://learn.microsoft.com/microsoft-365-copilot/extensibility/prerequisites#prerequisites)

1. First, select the Teams Toolkit icon on the left in the VS Code toolbar.
2. In the Account section, sign in with your [Microsoft 365 account](https://docs.microsoft.com/microsoftteams/platform/toolkit/accounts) if you haven't already.
3. Create Teams app by clicking `Provision` in "Lifecycle" section.
4. Select `Preview in Copilot (Edge)` or `Preview in Copilot (Chrome)` from the launch configuration dropdown.
5. Open the `Copilot` app and send a prompt to trigger your plugin.
   > Note: Please make sure to switch to New Teams when Teams web client has launched

{{#ApiKey}}
> [!NOTE]
> Teams Toolkit will ask you for your API key during provision. The API key will be securely stored with [Teams Developer Portal](https://dev.teams.microsoft.com/home) and used by Teams client to access your API in runtime. Teams Toolkit will not store your API key.
{{/ApiKey}}

{{#OAuth}}
> [!NOTE]
> Teams Toolkit will ask you for your Client ID and Client Secret for Oauth2 during provision. These information will be securely stored with [Teams Developer Portal](https://dev.teams.microsoft.com/home) and used by Teams client to access your API in runtime. Teams Toolkit will not store your Client ID and Client Secret.
{{/OAuth}}

## What's included in the template

| Folder       | Contents                                     |
| ------------ | -------------------------------------------- |
| `.vscode`    | VSCode files for debugging                   |
| `appPackage` | Templates for the Teams application manifest, the plugin manifest and the API specification |
| `env`        | Environment files                            |
{{#DeclarativeCopilot}}

The following files can be customized and demonstrate an example implementation to get you started.

| File                                 | Contents                                                                       |
| ------------------------------------ | ------------------------------------------------------------------------------ |
| `appPackage/declarativeCopilot.json` | Define the behaviour and configurations of the declarative copilot.            |
| `appPackage/manifest.json`           | Teams application manifest that defines metadata for your declarative copilot. |
{{/DeclarativeCopilot}}

The following are Teams Toolkit specific project files. You can [visit a complete guide on Github](https://github.com/OfficeDev/TeamsFx/wiki/Teams-Toolkit-Visual-Studio-Code-v5-Guide#overview) to understand how Teams Toolkit works.

| File                 | Contents                                                                                                                                  |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `teamsapp.yml`       | This is the main Teams Toolkit project file. The project file defines two primary things: Properties and configuration Stage definitions. |

## Addition information and references

{{#DeclarativeCopilot}}
- [Declarative copilots for Microsoft 365](https://aka.ms/teams-toolkit-declarative-copilot)
{{/DeclarativeCopilot}}
- [Extend Microsoft Copilot for Microsoft 365](https://aka.ms/teamsfx-copilot-plugin)
- [Message extensions for Microsoft Copilot for Microsoft 365](https://learn.microsoft.com/microsoft-365-copilot/extensibility/overview-message-extension-bot)
- [Microsoft Graph Connectors for Microsoft Copilot for Microsoft 365](https://learn.microsoft.com/microsoft-365-copilot/extensibility/overview-graph-connector)
- [Microsoft Copilot for Microsoft 365 extensibility samples](https://learn.microsoft.com/microsoft-365-copilot/extensibility/samples)