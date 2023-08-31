# Overview of Copilot Plugin app template

## Build Copilot Plugin from a new API with Azure Functions

The plugin allows Copilot to interact directly with third-party data, apps, and services, enhancing its capabilities and broadening its range of capabilities. Plugins allow Copilot to:

- Retrieve real-time information, for example, latest news coverage on a product launch.
- Retrieve knowledge-based information, for example, my team’s design files in Figma.
- Perform actions on behalf of the user, for example, create a Jira ticket.

## Get started with Copilot Plugin template

> **Prerequisites**
>
> To run the copilot plugin app template in your local dev machine, you will need:
>
> - [Node.js](https://nodejs.org/), supported versions: 16, 18
> - A [Microsoft 365 account for development](https://docs.microsoft.com/microsoftteams/platform/toolkit/accounts)
> - [Teams Toolkit Visual Studio Code Extension](https://aka.ms/teams-toolkit) version 5.0.0 and higher or [Teams Toolkit CLI](https://aka.ms/teamsfx-cli)
> - Join Microsoft 365 Copilot Plugin development [early access program](https://aka.ms/plugins-dev-waitlist).

1. First, select the Teams Toolkit icon on the left in the VS Code toolbar.
1. In the Account section, sign in with your [Microsoft 365 account](https://docs.microsoft.com/microsoftteams/platform/toolkit/accounts) if you haven't already.
1. Select `Debug in Copilot (Edge)` or `Debug in Copilot (Chrome)` from the launch configuration dropdown.
1. When Teams launches in the browser, click the `Apps` icon from Teams client left rail to open Teams app store and search for `Copilot`.
1. Open the `Copilot` app and send a prompt to trigger your plugin.

## What's included in the template

| Folder       | Contents                                     |
| ------------ | -------------------------------------------- |
| `.vscode`    | VSCode files for debugging                   |
| `appPackage` | Templates for the Teams application manifest |
| `env`        | Environment files                            |
| `infra`      | Templates for provisioning Azure resources   |
| `repair`     | The source code for the repair API           |

The following files can be customized and demonstrate an example implementation to get you started.

| File                                   | Contents                                                                     |
| -------------------------------------- | ---------------------------------------------------------------------------- |
| `repair/function.json`                 | A configuration file that defines the function’s trigger and other settings. |
| `src/index.js`                         | The main file of a function in Azure Functions.                              |
| `appPackage/adaptiveCards/repair.json` | A generated Adaptive Card that is sent to Teams.                             |
| `appPackage/apiSpecFiles/repair.yml`   | A file that describes the structure and behavior of the repair API.          |

The following are Teams Toolkit specific project files. You can [visit a complete guide on Github](https://github.com/OfficeDev/TeamsFx/wiki/Teams-Toolkit-Visual-Studio-Code-v5-Guide#overview) to understand how Teams Toolkit works.

| File                 | Contents                                                                                                                                  |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `teamsapp.yml`       | This is the main Teams Toolkit project file. The project file defines two primary things: Properties and configuration Stage definitions. |
| `teamsapp.local.yml` | This overrides `teamsapp.yml` with actions that enable local execution and debugging.                                                     |

## Addition information and references

- [Extend Microsoft 365 Copilot](https://learn.microsoft.com/en-us/microsoftteams/platform/copilot/how-to-extend-copilot)
