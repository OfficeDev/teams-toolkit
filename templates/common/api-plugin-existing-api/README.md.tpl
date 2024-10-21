{{^DeclarativeCopilot}}
# Overview of the API Plugin template

## Build an API Plugin from OpenAPI description document

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
# Overview of the basic declarative agent with API plugin template

## Build a basic declarative agent with API plugin

With the declarative agent, you can build a custom version of Copilot that can be used for specific scenarios, such as for specialized knowledge, implementing specific processes, or simply to save time by reusing a set of AI prompts. For example, a grocery shopping Copilot declarative agent can be used to create a grocery list based on a meal plan that you send to Copilot.

You can extend declarative agents using plugins to retrieve data and execute tasks on external systems. A declarative agent can utilize multiple plugins at the same time.

![image](https://github.com/user-attachments/assets/9939972e-0449-410c-b237-d9d748cd6628)

{{/DeclarativeCopilot}}

## Get started with the template

> **Prerequisites**
>
> To run this app template in your local dev machine, you will need:
>
> - [Node.js](https://nodejs.org/), supported versions: 16, 18
> - A [Microsoft 365 account for development](https://docs.microsoft.com/microsoftteams/platform/toolkit/accounts).
> - [Teams Toolkit Visual Studio Code Extension](https://aka.ms/teams-toolkit) version 5.0.0 and higher or [Teams Toolkit CLI](https://aka.ms/teamsfx-toolkit-cli)
> - [Microsoft 365 Copilot license](https://learn.microsoft.com/microsoft-365-copilot/extensibility/prerequisites#prerequisites)

1. First, select the Teams Toolkit icon on the left in the VS Code toolbar.
2. In the Account section, sign in with your [Microsoft 365 account](https://docs.microsoft.com/microsoftteams/platform/toolkit/accounts) if you haven't already.
3. Create Teams app by clicking `Provision` in "Lifecycle" section.
4. Select `Preview in Copilot (Edge)` or `Preview in Copilot (Chrome)` from the launch configuration dropdown.
{{^DeclarativeCopilot}}
4. When Teams launches in the browser, open the `Copilot` app.
5. Select `Plugins`, and from the list of plugins, turn on the toggle for your plugin. Now, you can send a prompt to trigger your plugin.
   > Note: Please make sure to switch to New Teams when Teams web client has launched
{{/DeclarativeCopilot}}
{{#DeclarativeCopilot}}
4. Select your declarative agent from the `Copilot` app.
5. Send a prompt.
{{/DeclarativeCopilot}}

{{#ApiKey}}
> [!NOTE]
> Teams Toolkit will ask you for your API key during provision. The API key will be securely stored with [Teams Developer Portal](https://dev.teams.microsoft.com/home) and used by Teams client to access your API in runtime. Teams Toolkit will not store your API key.
{{/ApiKey}}

{{#OAuth}}
> [!NOTE]
> If your identity server needs Proof of Key Code Exchange (PKCE) for token exchange, uncomment the `isPKCEEnabled` property in the` oauth/register` section of the `teamsapp.yml` file shown as below:
```yaml
  - uses: oauth/register
    with:
      name: {{ApiSpecAuthName}}
      flow: authorizationCode
      # Teams app ID
      appId: ${{TEAMS_APP_ID}}
      # Path to OpenAPI description document
      apiSpecPath: {{{ApiSpecPath}}}
      # Uncomment below property to use proof key for code exchange (PKCE)
      isPKCEEnabled: true
    writeToEnvironmentFile:
      configurationId: {{ApiSpecAuthRegistrationIdEnvName}}
```
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
| `appPackage/declarativeCopilot.json` | Define the behaviour and configurations of the declarative agent.            |
| `appPackage/manifest.json`           | Teams application manifest that defines metadata for your declarative agent. |
{{/DeclarativeCopilot}}

The following are Teams Toolkit specific project files. You can [visit a complete guide on Github](https://github.com/OfficeDev/TeamsFx/wiki/Teams-Toolkit-Visual-Studio-Code-v5-Guide#overview) to understand how Teams Toolkit works.

| File                 | Contents                                                                                                                                  |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `teamsapp.yml`       | This is the main Teams Toolkit project file. The project file defines two primary things: Properties and configuration Stage definitions. |

## Addition information and references

{{#DeclarativeCopilot}}
- [Declarative agents for Microsoft 365](https://aka.ms/teams-toolkit-declarative-agent)
{{/DeclarativeCopilot}}
- [Extend Microsoft 365 Copilot](https://aka.ms/teamsfx-copilot-plugin)
- [Message extensions for Microsoft 365 Copilot](https://learn.microsoft.com/microsoft-365-copilot/extensibility/overview-message-extension-bot)
- [Microsoft Graph Connectors for Microsoft 365 Copilot](https://learn.microsoft.com/microsoft-365-copilot/extensibility/overview-graph-connector)
- [Microsoft 365 Copilot extensibility samples](https://learn.microsoft.com/microsoft-365-copilot/extensibility/samples)