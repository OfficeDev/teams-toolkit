# Overview of the Copilot Plugin template

## Build a Copilot Plugin from a new API with Azure Functions

With Copilot extensibility, you can augment Copilot for Microsoft 365 with custom skills and organizational knowledge specific to your enterprise and users to enable truly spectacular AI scenarios. For example:

- Retrieve real-time information, for example, latest news coverage on a product launch.
- Retrieve knowledge-based information, for example, my team’s design files in Figma.

When you extend Copilot for Microsoft 365, you maximize the efficiency of your apps and data with AI, by:

- Enriching the data estate of your enterprise with industry-leading AI.
- Keeping your users in the flow of their work, start to finish.
- Inheriting world-class security, compliance, and privacy policies.

## Get started with the template

> **Prerequisites**
>
> To run this app template in your local dev machine, you will need:
>
> - [Node.js](https://nodejs.org/), supported versions: 18
> - A [Microsoft 365 account for development](https://docs.microsoft.com/microsoftteams/platform/toolkit/accounts)
> - [Teams Toolkit Visual Studio Code Extension](https://aka.ms/teams-toolkit) version 5.0.0 and higher or [Teams Toolkit CLI](https://aka.ms/teams-toolkit-cli)
> - [Copilot for Microsoft 365 license](https://learn.microsoft.com/microsoft-365-copilot/extensibility/prerequisites#prerequisites)

1. First, select the Teams Toolkit icon on the left in the VS Code toolbar.
2. In the Account section, sign in with your [Microsoft 365 account](https://docs.microsoft.com/microsoftteams/platform/toolkit/accounts) if you haven't already.
3. Select `Debug in Copilot (Edge)` or `Debug in Copilot (Chrome)` from the launch configuration dropdown.
4. When Teams launches in the browser, open the `Copilot` app.
5. Select `Plugins`, and from the list of plugins, turn on the toggle for your plugin. Now, you can send a prompt to trigger your plugin.
   > Note: Please make sure to switch to New Teams when Teams web client has launched

### How to add your own API Key

1. Open terminal and run command `npm install` to install all dependency packages

   ```
   > npm install
   ```

2. After `npm install` completed, run command `npm run keygen`
   ```
   > npm run keygen
   ```
3. The above command will output something like "Generated a new API Key: xxx..."
4. Fill in API Key into `env/.env.*.user`
   ```
   SECRET_API_KEY=<your-api-key>
   ```

## What's included in the template

| Folder       | Contents                                                                                    |
| ------------ | ------------------------------------------------------------------------------------------- |
| `.vscode`    | VSCode files for debugging                                                                  |
| `appPackage` | Templates for the Teams application manifest, the plugin manifest and the API specification |
| `env`        | Environment files                                                                           |
| `infra`      | Templates for provisioning Azure resources                                                  |
| `src`        | The source code for the repair API                                                          |

The following files can be customized and demonstrate an example implementation to get you started.

| File                                         | Contents                                                                                          |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `src/functions/repairs.js`                   | The main file of a function in Azure Functions.                                                   |
| `src/repairsData.json`                       | The data source for the repair API.                                                               |
| `src/keyGen.js`                              | Designed to generate a API key used for authorization.                                            |
| `appPackage/apiSpecificationFile/repair.yml` | A file that describes the structure and behavior of the repair API.                               |
| `appPackage/manifest.json`                   | Teams application manifest that defines metadata for your plugin inside Microsoft Teams.          |
| `appPackage/ai-plugin.json`                  | The manifest file for your Copilot Plugin that contains information for your API and used by LLM. |

The following are Teams Toolkit specific project files. You can [visit a complete guide on Github](https://github.com/OfficeDev/TeamsFx/wiki/Teams-Toolkit-Visual-Studio-Code-v5-Guide#overview) to understand how Teams Toolkit works.

| File                 | Contents                                                                                                                                  |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `teamsapp.yml`       | This is the main Teams Toolkit project file. The project file defines two primary things: Properties and configuration Stage definitions. |
| `teamsapp.local.yml` | This overrides `teamsapp.yml` with actions that enable local execution and debugging.                                                     |

## Addition information and references

- [Extend Microsoft Copilot for Microsoft 365](https://aka.ms/teamsfx-copilot-plugin)
- [Message extensions for Microsoft Copilot for Microsoft 365](https://learn.microsoft.com/microsoft-365-copilot/extensibility/overview-message-extension-bot)
- [Microsoft Graph Connectors for Microsoft Copilot for Microsoft 365](https://learn.microsoft.com/microsoft-365-copilot/extensibility/overview-graph-connector)
- [Microsoft Copilot for Microsoft 365 extensibility samples](https://learn.microsoft.com/microsoft-365-copilot/extensibility/samples)
