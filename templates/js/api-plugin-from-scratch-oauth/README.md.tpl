{{^DeclarativeCopilot}}
# Overview of the API Plugin template

## Build an API Plugin from a new API with Azure Functions

With Copilot extensibility, you can augment Microsoft 365 Copilot with custom skills and organizational knowledge specific to your enterprise and users to enable truly spectacular AI scenarios. For example:

- Retrieve real-time information, for example, latest news coverage on a product launch.
- Retrieve knowledge-based information, for example, my team’s design files in Figma.

When you extend Microsoft 365 Copilot, you maximize the efficiency of your apps and data with AI, by:

- Enriching the data estate of your enterprise with industry-leading AI.
- Keeping your users in the flow of their work, start to finish.
- Inheriting world-class security, compliance, and privacy policies.

![image](https://github.com/user-attachments/assets/1c125380-a935-4f65-a3b8-e8b9a646f3bc)
{{/DeclarativeCopilot}}
{{#DeclarativeCopilot}}
# Overview of the declarative agent with API plugin template

## Build a declarative agent with an API Plugin from a new API with Azure Functions

With the declarative agent, you can build a custom version of Copilot that can be used for specific scenarios, such as for specialized knowledge, implementing specific processes, or simply to save time by reusing a set of AI prompts. For example, a grocery shopping Copilot declarative agent can be used to create a grocery list based on a meal plan that you send to Copilot.

You can extend declarative agents using plugins to retrieve data and execute tasks on external systems. A declarative agent can utilize multiple plugins at the same time.
![image](https://github.com/user-attachments/assets/9939972e-0449-410c-b237-d9d748cd6628)
{{/DeclarativeCopilot}}

## Get started with the template

> **Prerequisites**
>
> To run this app template in your local dev machine, you will need:
>
> - [Node.js](https://nodejs.org/), supported versions: 18, 20
> - A [Microsoft 365 account for development](https://docs.microsoft.com/microsoftteams/platform/toolkit/accounts)
> - [Teams Toolkit Visual Studio Code Extension](https://aka.ms/teams-toolkit) version 5.0.0 and higher or [Teams Toolkit CLI](https://aka.ms/teams-toolkit-cli)
> - [Microsoft 365 Copilot license](https://learn.microsoft.com/microsoft-365-copilot/extensibility/prerequisites#prerequisites)

1. First, select the Teams Toolkit icon on the left in the VS Code toolbar.
2. In the Account section, sign in with your [Microsoft 365 account](https://docs.microsoft.com/microsoftteams/platform/toolkit/accounts) if you haven't already.
{{^DeclarativeCopilot}}
3. Select `Debug in Teams (Edge)` or `Debug in Teams (Chrome)` from the launch configuration dropdown.
4. When Teams launches in the browser, open the `Copilot` app.
5. Select `Plugins`, and from the list of plugins, turn on the toggle for your plugin. Now, you can send a prompt to trigger your plugin.
   > Note: Please make sure to switch to New Teams when Teams web client has launched
{{/DeclarativeCopilot}}
{{#DeclarativeCopilot}}
3. Select `Debug in Copilot (Edge)` or `Debug in Copilot (Chrome)` from the launch configuration dropdown.
4. Select your declarative agent from the `Copilot` app.
5. Send a message to Copilot to find a repair record.
{{/DeclarativeCopilot}}

## What's included in the template

| Folder       | Contents                                                                                    |
| ------------ | ------------------------------------------------------------------------------------------- |
| `.vscode`    | VSCode files for debugging                                                                  |
| `appPackage` | Templates for the Teams application manifest, the plugin manifest and the API specification |
| `env`        | Environment files                                                                           |
| `infra`      | Templates for provisioning Azure resources                                                  |
| `src`        | The source code for the repair API                                                          |

The following files can be customized and demonstrate an example implementation to get you started.

| File                                            | Contents                                                                                                                      |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `src/functions/repairs.js`                      | The main file of a function in Azure Functions.                                                                               |
| `src/functions/middleware/tokenCacheWrapper.js` | A wrapper class that handles caching of JWT signing keys to improve performance of token validation.                          |
| `src/functions/middleware/tokenValidator.js`    | Core class for validating JWT tokens from Microsoft Entra, including checks for claims, scopes, roles, and tenant validation. |
| `src/functions/middleware/authMiddleware.js`    | Middleware function that handles authorization using JWT tokens, integrating with the token validator.                        |
| `src/functions/middleware/utils.js`             | Utility functions for authentication, including retrieving JWKS URIs for different cloud environments.                        |
| `src/functions/middleware/config.js`            | Configuration file that exports Microsoft Entra app settings from environment variables.                                      |
| `src/repairsData.json`                          | The data source for the repair API.                                                                                           |
| `appPackage/apiSpecificationFile/repairs.yml`    | A file that describes the structure and behavior of the repair API.                                                           |
| `appPackage/manifest.json`                      | Teams application manifest that defines metadata for your plugin inside Microsoft Teams.                                      |
| `appPackage/ai-plugin.json`                     | The manifest file for your API Plugin that contains information for your API and used by LLM.                                 |
{{#DeclarativeCopilot}}
| `appPackage/repairDeclarativeAgent.json`        | Define the behaviour and configurations of the declarative agent.                                                             |
{{/DeclarativeCopilot}}

The following are Teams Toolkit specific project files. You can [visit a complete guide on Github](https://github.com/OfficeDev/TeamsFx/wiki/Teams-Toolkit-Visual-Studio-Code-v5-Guide#overview) to understand how Teams Toolkit works.

| File                 | Contents                                                                                                                                                                                                                                                |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `teamsapp.yml`       | This is the main Teams Toolkit project file. The project file defines two primary things: Properties and configuration Stage definitions.                                                                                                               |
| `teamsapp.local.yml` | This overrides `teamsapp.yml` with actions that enable local execution and debugging.                                                                                                                                                                   |
| `aad.manifest.json`  | This file defines the configuration of Microsoft Entra app. This template will only provision [single tenant](https://learn.microsoft.com/azure/active-directory/develop/single-and-multi-tenant-apps#who-can-sign-in-to-your-app) Microsoft Entra app. |
{{^MicrosoftEntra}}

## How OAuth works in the API plugin

![oauth-flow](https://github.com/OfficeDev/teams-toolkit/assets/107838226/f074abbe-d9e3-4a46-8e08-feb66b17a539)
{{/MicrosoftEntra}}

{{#DeclarativeCopilot}}
## Extend the template

- [Add conversation starters](https://learn.microsoft.com/microsoft-365-copilot/extensibility/build-declarative-agents?tabs=ttk&tutorial-step=3): Conversation starters are hints that are displayed to the user to demonstrate how they can get started using the declarative agent.
- [Add web content](https://learn.microsoft.com/microsoft-365-copilot/extensibility/build-declarative-agents?tabs=ttk&tutorial-step=4) for the ability to search web information.
- [Add OneDrive and SharePoint content](https://learn.microsoft.com/microsoft-365-copilot/extensibility/build-declarative-agents?tabs=ttk&tutorial-step=5) as grounding knowledge for the agent.
- [Add Microsoft Graph connectors content](https://learn.microsoft.com/microsoft-365-copilot/extensibility/build-declarative-agents?tabs=ttk&tutorial-step=6) to ground agent with enterprise knowledge.
- [Add API plugins](https://learn.microsoft.com/microsoft-365-copilot/extensibility/build-declarative-agents?tabs=ttk&tutorial-step=7) for agent to interact with REST APIs.
{{/DeclarativeCopilot}}

## Addition information and references

{{#DeclarativeCopilot}}
- [Declarative agents for Microsoft 365](https://aka.ms/teams-toolkit-declarative-agent)
{{/DeclarativeCopilot}}
- [Extend Microsoft 365 Copilot](https://aka.ms/teamsfx-copilot-plugin)
- [Message extensions for Microsoft 365 Copilot](https://learn.microsoft.com/microsoft-365-copilot/extensibility/overview-message-extension-bot)
- [Microsoft Graph Connectors for Microsoft 365 Copilot](https://learn.microsoft.com/microsoft-365-copilot/extensibility/overview-graph-connector)
- [Microsoft 365 Copilot extensibility samples](https://learn.microsoft.com/microsoft-365-copilot/extensibility/samples)
