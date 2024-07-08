# Teams Toolkit Pre-release

## Changelog

> Note: This changelog only includes the changes for the pre-release versions of Teams Toolkit. For the changelog of stable versions, please refer to the [Teams Toolkit Changelog](https://github.com/OfficeDev/TeamsFx/blob/dev/packages/vscode-extension/CHANGELOG.md).

### June 12, 2024

#### New Features

- **Build AI Agent With Assistant API and Python**: Previously we have included the AI Assistant Bot app template to help you get started with building a GPT-like chat bot with AI capabilities using `Teams AI Library`. Now we have added a new AI Agent app template to help you build an AI agent with Assistant API and Python. This template showcases how to build an intelligent chat bot in Teams capable of helping users accomplish a specific task using natural language right in the Teams conversations, such as solving a math problem.

#### Bug Fixes

- Fixed an issue where sometimes you may not be able to scroll down in Teams Toolkit CLI. [#11762](https://github.com/OfficeDev/teams-toolkit/pull/11762)
- Fixed an issue where Teams Toolkit generated Adaptive Cards may contain empty property. [#11759](https://github.com/OfficeDev/teams-toolkit/pull/11759)
- Fixed an issue where you may need to press enter twice after selecting resource group during provision using Teams Toolkit CLI. [#11724](https://github.com/OfficeDev/teams-toolkit/pull/11724)
- Fixed an issue to enable shell option in Windows platform to avoid [command injection via args parameters](https://nodejs.org/en/blog/vulnerability/april-2024-security-releases-2#command-injection-via-args-parameter-of-child_processspawn-without-shell-option-enabled-on-windows-cve-2024-27980---high). [#11699](https://github.com/OfficeDev/teams-toolkit/pull/11699)
- Fixed an issue where provision summary logs are printed twice. [#11658](https://github.com/OfficeDev/teams-toolkit/pull/11658)


### April 18, 2024

#### New Features 

- **Create API based Message Extensions using auth-protected API** </br> 
  Teams Toolkit supports two types of API authentication protection in your API based Message Extension app: </br> 
  ![add-auth-api-me](https://github.com/OfficeDev/TeamsFx/assets/113089977/c5faea2f-676b-4a8c-82d6-f3b037e54f0e) 
  - API-Key: you can either add the API key of your existing API, or if you don't have an API, Teams Toolkit will generate one to show how authentication works. 
  - Microsoft Entra (Azure AD): Teams Toolkit can help you create Microsoft Entra ID to authenticate your new API. 

- **Debug Message Extensions in Teams App Test Tool** </br> 
  Teams App Test Tool helps developers to debug and test in a web-based environment that emulates Microsoft Teams without using tunnels or Microsoft 365 account. In this version we add Teams App Test Tool support to search-based, action-based and link unfurling Message Extension app. 
  ![ME-test-tool](https://github.com/OfficeDev/TeamsFx/assets/113089977/2b55996f-87a9-4683-abaf-3089b7ea878e) 
  The picture below shows search-based and action-based Message Extension app running in Teams App Test Tool:</br> 
  ![ME-in-test-tool-example](https://github.com/OfficeDev/TeamsFx/assets/113089977/b255737a-9bfc-4c58-9324-985aaf81298a) 

- **Create intelligent chatbot with domain knowledge from custom data** </br> 
  Custom Copilot is an AI-powered chatbot with RAG capability that can understand natural language and retrieve domain data to answer domain-specific questions. Teams Toolkit now supports to access your custom data in Custome Copilot app.</br> 
  When create the Custom Copilot app, you can select "Chat with your data" and then select the desired data source.</br> 
  ![access-data-custom-copilot](https://github.com/OfficeDev/TeamsFx/assets/113089977/d40cfc84-8cb8-4816-b587-668a2bcf9560) 
  There are four kinds of data source for you to choose:</br> 
  ![data-source-custom-copilot](https://github.com/OfficeDev/TeamsFx/assets/113089977/2d010366-96a0-4f8b-861d-28d5bb9e36b8) 
  - Custom data source: you can add whatever data source you want to Custom Copilot app, for example file system or vector DB. 
  - Azure AI Search: your chatbot can access data on Azure AI search service and use it in conversation with users. 
  - Custom API: your chatbot can invoke the API defined in the OpenAPI description document to retrieve domain data from API service.  
  - Microsoft Graph + SharePoint: your chatbot can query M365 context data from Microsoft Graph Search API as data source in the conversation. 

- **Develop Word, Excel and PowerPoint Add-ins in Teams Toolkit**
  ![WXP Add-in](https://github.com/OfficeDev/TeamsFx/assets/11220663/30679a8c-b0b0-4b1c-ad4f-114547a12a6b)
  Teams Toolkit now supports Microsoft Word, Excel, or PowerPoint JavaScript add-in development. Now you can see the above side pane offering a unified and centralized experience for checking dependencies, running and debugging add-ins, managing lifecycle, leveraging utility, getting help, and providing feedback.

#### Enhancements

- Users may encounter issues when creating Microsoft Entra client secrete due to tenant regulations. We smooth this experience by enabling users to customize parameters when creating Microsoft Entra client secret and provide help docs to easily resolve issues. The parameters user can specify in teamsapp.yml file are `clientSecretExpireDays` and `clientSecretDescription`.
![create-aad-parameter](https://github.com/OfficeDev/TeamsFx/assets/113089977/76d219d6-6f40-464c-81c6-1b660953cc1f)

### March 19, 2024

#### New Features

- **Build Your Own Copilots in Teams with Teams AI Library**
![Custom Copilots](https://github.com/OfficeDev/TeamsFx/assets/11220663/0387a2ce-ec39-4c72-aabc-1ec2b9e85d59)
We have enhanced the user experience for developers to create their custom copilots, an AI-powered intelligent chatbot for Teams, with the following improvements:
  - Streamlined UX for scaffolding, including top-level entry points and easy configuration of LLM services and credentials during the scaffolding flow.
  - New application templates allowing developers to build an AI Agent from scratch.
  - Python language support for building a `Basic AI Chatbot`.

#### Enhancements

- Updated the default app icon in the Teams Toolkit-generated app templates and samples with Microsoft 365 and Copilot-themed colors.
- Added `LLM.Description` in the app manifest for bot-based message extensions when used as copilot plugin for better reasoning with LLMs. To utilize this feature, please enable the `Develop Copilot Plugin` feature setting via Visual Studio Code in the [User and Workspace Settings](https://code.visualstudio.com/docs/getstarted/settings) and create a new app via `Create a New App` -> `Message Extension` -> `Custom Search Results` -> `Start with Bot`.
- Improved Azure account authentication with a built-in Microsoft authentication provider in Visual Studio Code. This enhancement increases the reliability of Azure authentication, especially when using a proxy.
- Upgraded `Custom Search Results` (Start with a New API) template to Azure Functions v4, the officially recommended version with better support. See more details for [Azure Functions runtime versions overview](https://learn.microsoft.com/azure/azure-functions/functions-versions?tabs=isolated-process%2Cv4&pivots=programming-language-javascript).
- Multiple parameters are now supported for API-based message extensions.
- Updated `Teams Chef Bot` sample to [teams-ai repository](https://github.com/microsoft/teams-ai/tree/main/js/samples/04.ai.a.teamsChefBot).

#### Bug Fixes

- Fixed an issue where an empty env file path might appear in error messages. [#11024](https://github.com/OfficeDev/TeamsFx/pull/11024)
- Fixed an issue where `arm/deploy.UnhandledError` might appear. [#10911](https://github.com/OfficeDev/TeamsFx/pull/10911)
- Fixed an issue with inconsistent capitalizations in the project creation dialog. [#10792](https://github.com/OfficeDev/TeamsFx/pull/10792)
- Fixed an issue with Teams Toolkit CLI where `Error: TeamsfxCLI.CannotDetectRunCommand` might appear when using the `teamsapp preview` command. [#10808](https://github.com/OfficeDev/TeamsFx/pull/10808)
- Fixed an issue with unclear error messages when sideloading the app using an unsupported file format. [#10799](https://github.com/OfficeDev/TeamsFx/pull/10799)
- Fixed an issue where an unexpected error might occur when executing `teamsapp account login azure`. [#11015](https://github.com/OfficeDev/TeamsFx/pull/11015)
- Fixed broken links in README documentation. [#10836](https://github.com/OfficeDev/TeamsFx/pull/10836), [#10831](https://github.com/OfficeDev/TeamsFx/pull/10831)
- Fixed an issue where featured samples are not shown in the full list. [#10841](https://github.com/OfficeDev/TeamsFx/pull/10841)


### January 23, 2024

#### New Features

- **Deploy Tab Apps to Static Web App**: Azure Static Web Apps, an automatic service for building and deploying full-stack web apps to Azure from a code repository, is now the default solution for deploying Tab-based applications in Teams Toolkit. If you prefer the old way using Azure Storage, please refer to this [sample](https://github.com/OfficeDev/TeamsFx-Samples/tree/dev/hello-world-tab-codespaces).

### Enhancements

- **Clean up `.deployment` Folder in between Deployments**: Teams Toolkit now cleans up the `.deployment` folder in the build directory before each deployment, addressing a [known issue](https://github.com/OfficeDev/TeamsFx/issues/10075) and reducing deployment time.
  
- **Optimized Dev Tunnel Expiration**: Inactive Dev Tunnel instances will now be automatically cleaned up after an hour, mitigating Dev Tunnel instance limitation errors.

- **Log Level Settings**: Added log level settings for controlling the verbosity of Teams Toolkit logs. You can find the settings in the [User and Workspace Settings](https://code.visualstudio.com/docs/getstarted/settings) under the `Teams Toolkit` section.
![Logs](https://github.com/OfficeDev/TeamsFx/assets/11220663/3a1fc3a0-d69b-446e-8db2-0c756a18f95e)

- **Richer Information in Sample App Details Page**: The Sample app detail page now includes additional details from the project README file, such as the project description, prerequisites, and steps to run the project.

- **Improved Troubleshooting for Multi-tenant Scenario**: Teams Toolkit now provides a [troubleshooting guide](https://aka.ms/teamsfx-multi-tenant) for scenarios where `aadApp/update` action fails with a `HostNameNotOnVerifiedDomain` error in multi-tenant setups.

- **Optimized SPFx Solution Version Handling**: Teams Toolkit now compares the SPFx solution version between global installations and the one used by Teams Toolkit when developers add additional web parts. Developers will be prompted if there's a need to install or upgrade the solution version when differences are detected.

#### New Additions to the Sample App Gallery

- **Format Reddit Link into Adaptive Card**: This sample application demonstrates how to format a Reddit link into an Adaptive Card in Microsoft Teams conversations.
![Link Unfurling Sample](https://github.com/OfficeDev/TeamsFx/assets/11220663/0d44f8c3-d02e-4912-bfa2-6ed3fdb29c1b)

#### Teams Toolkit CLI ([`@microsoft/teamsapp-cli`](https://www.npmjs.com/package/@microsoft/teamsapp-cli)) `v3.0.0@beta`
![Teams Toolkit CLI](https://camo.githubusercontent.com/67608a468cbd406d6ff18585c8bc3b34d3d97d0a8ef525bdf516ca23fd5e32dd/68747470733a2f2f616b612e6d732f636c692d6865726f2d696d616765)
Teams Toolkit CLI version 3 is now in public preview. Major changes include:

- **New Command Signature**: Teams Toolkit CLI now starts with `teamsapp` as the root command signature for more clarity. We recommend changing your scripts to use `teamsapp` as the command prefix.

- **New Command Structure**: Teams Toolkit CLI now has a new command structure that is more intuitive and easier to use. You can find the new command structure in the [Teams Toolkit CLI Command Reference](https://aka.ms/teamsfx-toolkit-cli).

- **New Doctor Command**: `teamsapp doctor` command is a new command that helps diagnose and fix common issues with Teams Toolkit and Teams application development.

#### Bug Fixes

- Fixed an issue where you might see a `User canceled` error when canceling a new app creation. [#10691](https://github.com/OfficeDev/TeamsFx/pull/10691)
- Fixed an issue where the Node.js installation link redirects to a 404 page. [#10587](https://github.com/OfficeDev/TeamsFx/pull/10587)
- Fixed an issue with the accuracy of reflecting the latest Copilot Access status. [#10555](https://github.com/OfficeDev/TeamsFx/pull/10555)
- Fixed an issue where the debug profile name for Microsoft Teams is not accurately reflected in the debug configuration. [#10478](https://github.com/OfficeDev/TeamsFx/pull/10478)
- Fixed an issue where you might accidentally exceed the maximum length of application names without any warning messages. [#10457](https://github.com/OfficeDev/TeamsFx/pull/10457) 
- Fixed an issue where `undefined` is printed in Teams application validation summary. [#10445](https://github.com/OfficeDev/TeamsFx/pull/10445)
- Fixed an issue where you might accidentally see the incorrect changelog file popped up. [#10390](https://github.com/OfficeDev/TeamsFx/pull/10390)
- Fixed an issue in Sample App Gallery where the multi-selection did not follow the order of the selection. [#10364](https://github.com/OfficeDev/TeamsFx/pull/10364)
- Fixed a number of issues in the Sample App Gallery UI. [#10363](https://github.com/OfficeDev/TeamsFx/pull/10363)



### November 15, 2023

This is a hot fix version that contains a bug fix:

- Fixed an issue in Teams Toolkit CLI where an environment variable is unexpectedly shared between Teams Toolkit CLI and Teams Toolkit for Visual Studio Code.

### November 14, 2023

#### New Features

- **AI Assistant Bot App Template**: We have introduced a new AI Assistant Bot app template built on top of [Teams AI library](https://learn.microsoft.com/microsoftteams/platform/bots/how-to/teams%20conversational%20ai/teams-conversation-ai-overview) and [OpenAI Assistants API](https://platform.openai.com/docs/assistants/overview/agents). It showcases how to build an intelligent chat bot in Teams capable of helping users accomplish a specific task using natural language right in the Teams conversations, such as solving a math problem.
    ![Assistant Bot](https://github.com/OfficeDev/TeamsFx/assets/11220663/c4167b93-6ca6-4f59-ade1-23a6342fcfc9)

- **Debug Teams Bot Application in Teams App Test Tool**: Teams App Test Tool is a component integrated in Teams Toolkit that helps developers to debug, test and iterate on the app design of a Teams bot application in a web-based chat environment that emulates the behavior, look and feel of Microsoft Teams without using tunnels or Microsoft 365 account.
    ![Test Tool](https://github.com/OfficeDev/TeamsFx/assets/11220663/83b7bf29-019d-4512-86dc-67246c77453e)
  
- **Integrated Adaptive Card Previewer**: We have integrated the [Adaptive Card Previewer](https://aka.ms/acp-docs) into Teams Toolkit to help you preview and edit Adaptive Cards in a more intuitive way.
    ![ACP Integration](https://github.com/OfficeDev/TeamsFx/assets/11220663/8bf0b9ac-99c3-4e69-a10f-93b0d1c539c9)
  
- **Refreshed Look for Sample App Gallery**: The sample app gallery in Teams Toolkit now has a refreshed look and feel to help you find the right sample app for your needs more easily. You can now:
  - Filter sample apps by app type, app capability, and programming language.
  - Checkout the `Featured Samples` on top.
  - Switch to a `List View` that fits more sample apps in one screen.
    ![Sample Gallery](https://github.com/OfficeDev/TeamsFx/assets/11220663/5cfb778e-75e8-4217-a44f-a9a0b8069415)

- **License Check for Copilot**: We have added a helpful license check UI that detects if your account has been assigned Microsoft Copilot licenses before you started developing Copilot Plugins. To utilize this feature, please enable the `Develop Copilot Plugin` feature setting via Visual Studio Code in the [User and Workspace Settings](https://code.visualstudio.com/docs/getstarted/settings).
    ![Copilot License](https://github.com/OfficeDev/TeamsFx/assets/11220663/77174b9d-f1fe-4fe3-932c-ae2a274eb0d6)

#### Enhancements

- **Recommended Regions in Provision**: Now Teams Toolkit will display a list of recommended regions on top when provisioning cloud resources to Azure. You can still choose other regions from the dropdown list.
  ![Recommended Region](https://github.com/OfficeDev/TeamsFx/assets/11220663/016c25f9-8f0d-4d7d-9702-9f7d9405850a)

- **Automatic `npm install` for SPFx Tab App**: We have added enhancement for SPFx Tab App to auto-execute `npm install` in the background after the project is scaffolded. Now developers can get code intellisense when developing after the project is created.
    ![SPFx Auto NPM](https://github.com/OfficeDev/TeamsFx/assets/11220663/c5e12033-7194-4374-afb3-2f60d4a390e9)

#### New Additions to the Sample App Gallery

- **Large Scale Notification Bot**: This sample app demonstrates the architecture of a Teams notification bot app created by Teams Toolkit to send individual chat messages to a large number of users in a tenant.
    ![Large Scale](https://github.com/OfficeDev/TeamsFx-Samples/raw/v3/large-scale-notification/assets/architecture.jpg)

- **Graph Connector Bot**: This sample app showcases how to build a Teams command bot that queries custom data ingested into Microsoft Graph using Graph connector.

#### Develop Bots and Message Extensions using Python

We have added support for Python in Teams Toolkit. You can now create Teams bots and messages extensions using Python starting from the following samples:

- Teams Conversation Bot using Python
- Teams Messaging Extensions Search using Python

![Python Samples](https://github.com/OfficeDev/TeamsFx/assets/11220663/17358f09-8ec8-475a-896c-3faf7422ecff)

#### Teams Toolkit CLI ([`@microsoft/teamsfx-cli`](https://www.npmjs.com/package/@microsoft/teamsfx-cli)) `v2.0.3@beta`

- Updated `AAD` to `Microsoft Entra` in command descriptions, logs, and error messages. See more on [Azure Active Directory rebranding](https://devblogs.microsoft.com/identity/aad-rebrand/).
- Updated `teamsfx m365 sideloading` command with support to sideload a xml-based Outlook add-in project, example command: `teamsfx m365 sideloading --xml-path manifest.xml`.
- Added an alias `teamsapp` as root command signature. Now you can use both `teamsfx` and `teamsapp` as command prefix. We recommend you to start changing your scripts to use `teamsapp` as the command prefix.

#### TeamsFx React SDK ([`@microsoft/teamsfx-react`](https://www.npmjs.com/package/@microsoft/teamsfx-react)) `v3.1.0@beta`

- Added loading parameter in `useTeams` hook.

#### Bug Fixes

- Fixed an issue where you would see `No localized strings file found` error in Visual Studio Code output. ([#10090](https://github.com/OfficeDev/TeamsFx/pull/10090))
- Fixed an issue where you would see a falsh when selecting an option in quick pick. ([#10100](https://github.com/OfficeDev/TeamsFx/pull/10100))
- Fixed a string typo in `Create a New App` dialog. ([#10197](https://github.com/OfficeDev/TeamsFx/pull/10197))

### October 10, 2023

#### New Features

- **API-Based Message Extension**: We have introduced a whole new way to build search-based message extension - from a new API with Azure Functions or from your existing API with an OpenAPI description document. This is a great starting point for building a message extension that requires a backend to fetch data from a third-party API or a database.
    ![API-Based Message Extension](https://aka.ms/changelog-img-api-me)

- **Sample App Gallery Search**: We have introduced the ability to search for sample apps within the Sample App Gallery.
    ![Sample Gallery](https://github.com/OfficeDev/TeamsFx/assets/11220663/87a705e2-aa79-46dc-87ba-204f20fd3771)

- **Custom Search Results Template Optimization**: We've optimized the `Custom Search Results` (Using Bot Framework) project template to seamlessly integrate with Microsoft 365 Copilot. To utilize this feature, please enable the `Develop Copilot Plugin` feature setting via Visual Studio Code in the [User and Workspace Settings](https://code.visualstudio.com/docs/getstarted/settings) and enroll in the Microsoft 365 Copilot [Early Access Program](https://aka.ms/PluginsEarlyAccess).
    ![Copilot Plugin](https://aka.ms/changelog-img-bot-plugin)

#### New Additions to the Sample App Gallery

- **SSO Enabled Tab via APIM Proxy**: This sample app showcases how to build a single-page web application with a single sign-on feature leveraging Azure API Management service as a proxy to perform on-behalf-of flow, eliminating the need for a dedicated backend.
    ![APIM-Architecture](https://github.com/OfficeDev/TeamsFx-Samples/assets/63089166/a256f1ab-1b23-4264-9f0d-ed8ff45aea09)

- **Contoso Retail Dashboard**: This sample app demonstrates how to build a dashboard for viewing different control layouts. It shows you how to create a Microsoft Teams personal app with SharePoint Framework, available in Teams, Outlook and the Microsoft 365 app.
    ![Contoso Retail Dashboard](https://github.com/OfficeDev/TeamsFx/assets/11220663/172af4c7-e5d0-4159-9b62-16aff271c4c5)

#### Enhanced Sample App Contribution Process

In addition to these two new sample projects, we have set up a self-service process for any contributor to submit request to onboard new samples. You can now submit your sample app to the gallery by following the [Teams Toolkit Sample App Contribution Guidelines](https://github.com/OfficeDev/TeamsFx-Samples/blob/dev/CONTRIBUTING.md). We are excited to see more sample apps from the community! 🥳
    ![Sample Contribution Process](https://github.com/OfficeDev/TeamsFx/assets/11220663/9babc3b6-f89f-489a-9988-4ef9cc315e75)

#### Teams Toolkit CLI ([`@microsoft/teamsfx-cli`](https://www.npmjs.com/package/@microsoft/teamsfx-cli)) `v2.0.3@beta`

In this beta release of Teams Toolkit CLI, we have implemented a number of usability improvements based on your valuable feedback.

- **Hierarchical Command Structure**: Commands have been reorganized into a hierarchical structure.

- **Redesigned Help Command**: The help command has been redesigned for improved readability, including vertical and column alignments for commands and their descriptions, refined subcommands, command options/arguments, and global options, support for option abbreviations, indicators of required options, and inclusion of example commands.
    ![CLI-2](https://github.com/OfficeDev/TeamsFx/assets/11220663/e365832f-cd38-4a6d-89ca-ebd8721a48e8)

- **New `teamsfx list` Command**: We've added the `teamsfx list` command for reviewing available project templates and samples.
    ![CLI-1](https://github.com/OfficeDev/TeamsFx/assets/11220663/8b9da73e-2159-4276-9719-5688a36b4c28)

- **Enhanced Outputs and Streamlined Log Levels**: Outputs have been refreshed, and log levels have been streamlined for clarity.
    ![CLI-3](https://github.com/OfficeDev/TeamsFx/assets/11220663/077fe077-e12e-4617-b326-caefd7934dbe)

- **Improved Compatibility**: Color issues for terminals with light-colored backgrounds have been fixed, and suggestions for misspelled commands have been added.

- **Global Config Commands Removal**: The global config commands, `teamsfx config set` and `teamsfx config get` have been removed and are now incorporated into global options.

- **Upload custom applications across Microsoft 365**: We've added the ability to upload custom applications across Microsoft 365, including Teams, Outlook, and the Microsoft 365 app via `teamsfx m365` commands.

#### TeamsFx SDK for .NET ([`Microsoft.TeamsFx`](https://www.nuget.org/packages/Microsoft.TeamsFx)) `v2.2.0`

- Deprecated `MsGraphAuthProviders` with `GraphServiceClient` since token credentials are natively supported in [Microsoft Graph SDK for .NET](https://github.com/microsoftgraph/msgraph-sdk-dotnet/blob/c3baee460e0420f93b151548a07754310447e448/src/Microsoft.Graph/GraphServiceClient.cs#L47).
- Added `validationEnabled` param to `getPagedInstallationAsync` API for better performance to support the use case of sending notifications in large scale tenants.

#### Bug Fixes

- Fixed an issue where Teams Toolkit CLI always creates new project folder in a different directory than the current one. ([#9586](https://github.com/OfficeDev/TeamsFx/pull/9586))
- Fixed an issue where Teams Toolkit CLI did not accept region choice in non-interactive mode when provisioning cloud resources to Azure. ([#9604](https://github.com/OfficeDev/TeamsFx/pull/9604))
- Fixed an issue where the CodeLens `This file is auto-generated, click here to edit the manifest template file` in `aad.local.json` file was not responding properly. ([#9699](https://github.com/OfficeDev/TeamsFx/pull/9699))
- Fixed an issue with build warnings in `TeamsFx` SDK. ([#9707](https://github.com/OfficeDev/TeamsFx/pull/9707))
- Fixed an issue where the depency of `@microsoft/microsoft-graph-client` used in the `@microsoft/teamsfx` and `@microsoft/teamsfx-react` SDK were not updated to the latest version. ([#9720](https://github.com/OfficeDev/TeamsFx/pull/9720))

### Aug 15, 2023

New features:

- A new app template `AI Chat Bot` to help you get started with building a GPT-like chat bot with AI capabilities using `Teams AI Library`.
  ![AI Bot](https://github.com/OfficeDev/TeamsFx/assets/11220663/86a90d2a-efc3-4d8b-9e8c-5d34a1e8c081)
- Onboarded a new sample `One Productivity Hub using Graph Toolkit with SPFx` that shows you how to build a tab for viewing your calendar events, to-do tasks and files by using Microsoft Graph Toolkit components and SharePoint provider.
    ![SPFx Sample](https://github.com/OfficeDev/TeamsFx/assets/11220663/084ac508-49ea-4b30-854c-8b4d578ff6ee)
- Added CodeLens to the `teamsapp.yml` file to help you run life-cycle commands easily after editing the file.
    ![Inline Commands](https://github.com/OfficeDev/TeamsFx/assets/11220663/f6897b26-0e3c-441c-b028-32093e8322a7)

Enhancements:

- Simplified `Collect Form Input and Process Data` template to remove redundant code.
- Updated `Custom Search Result` template to use Adaptive Card for rendering search results.
- Added a link to view similar issues when you encounter system errors using Teams Toolkit.
    ![image](https://github.com/OfficeDev/TeamsFx/assets/11220663/ec48bef2-fc59-4e0b-8f0f-263f4706f394)
- Added a new property `additionalMetadata` & `sampleTag` in the yml schema for tracking telemetry events when using Teams Toolkit.
    > Note that the project created starting from this version of Teams Toolkit can operate in older versions.
- Added progress bar when importing an existing xml-based Outlook add-in project.

Teams Toolkit CLI ([`@microsoft/teamsfx-cli`](https://www.npmjs.com/package/@microsoft/teamsfx-cli)) `v2.0.2@beta`:

- Updated `teamsfx new` command to start from choosing app templates. You can use `teamsfx new template sample-app-name` to directly create a project from sample apps.

TeamsFx SDK ([`@microsoft/teamsfx`](https://www.npmjs.com/package/@microsoft/teamsfx)) `v2.2.3@beta`:

- Deprecated `TeamsFx` class as it's no longer being used to construct credentials any more.
- Deprecated `handleMessageExtensionQueryWithToken` API as it has been replaced by `handleMessageExtensionQueryWithSSO`.
- Deprecated `AuthenticationConfiguration` interface as it has been replaced by `OnBehalfOfCredentialAuthConfig` type.
- Deprecated `MsGraphAuthProvider` class as `TokenCredentialAuthentication` has been natively supported in [Microsoft Graph Client Library since version 3.0.0](https://github.com/microsoftgraph/msgraph-sdk-javascript/blob/dev/docs/TokenCredentialAuthenticationProvider.md).

Bug fixes:

- Fixed an issue in `teamsfx validate` command where input arguments are ignored when setting `--interactive false`. ([#9546](https://github.com/OfficeDev/TeamsFx/pull/9546))
- Fixed an issue where `Get Started with Teams Toolkit` did not pop up for new users after installing Teams Toolkit. ([#9526](https://github.com/OfficeDev/TeamsFx/pull/9526))
- Fixed an issue in `teamsfx new template <sample-name>` command where `Teams Chef Bot` option was missing. ([#9413](https://github.com/OfficeDev/TeamsFx/pull/9413))
- Fixed an issue where the `Teams: Upgrade Teams Manifest` command did not update the manifest to an expected version.  ([#9320](https://github.com/OfficeDev/TeamsFx/pull/9320))
- Fixed an issue where severity vulnerability was reported when using Teams Toolkit CLI.  ([#9309](https://github.com/OfficeDev/TeamsFx/pull/9309))

### July 18, 2023

New features:

- Import an existing SharePoint Framework solution and continue development with Teams Toolkit.
    ![SPFx Existing App](https://github.com/OfficeDev/TeamsFx/assets/11220663/3944f5c8-6c8c-4b4d-8df8-dc4f45b5967f)
- A new link unfurling app template to help you get started with displaying rich content from links in Teams messages and Outlook emails.
    ![Link Unfurling](https://github.com/OfficeDev/TeamsFx/assets/11220663/6e8b982a-0531-4ec1-8420-f6f17955ff40)

Enhancement:

- Updated `React with Fluent UI` app template to use an On-Behalf-Of flow for Single Sign-on to improve the experience in mobile platforms.
- Updated project scaffold success notification for Outlook Add-in.

TeamsFx SDK ([`@microsoft/teamsfx`](https://www.npmjs.com/package/@microsoft/teamsfx)) `v2.2.2`:

- Renamed the internal class `ConversationReferenceStore` to `DefaultConversationReferenceStore`.
- Deprecated the `NotificationStorage` interface.
- Added `ConversationReferenceStore` that has support for pagination.
- Added a new option to set a custom `ConversationReferenceStore` and deprecated the existing option for `NotificationStorage`.

Teams Toolkit CLI ([`@microsoft/teamsfx-cli`](https://www.npmjs.com/package/@microsoft/teamsfx-cli)) `v2.0.2@beta`:

- (Feature parity with Visual Studio Code) Import an existing SPFx solution and continue development with Teams Toolkit.
- (Feature parity with Visual Studio Code) Create a new link unfurling app with Teams Toolkit.

Bug fixes:

- Fixed an issue where CodeLens hints would only open an Adaptive Card if it was in an `adaptiveCards` folder. ([#9232](https://github.com/OfficeDev/TeamsFx/pull/9232))
- Fixed an issue in Teams Toolkit CLI where we did not show correct error messages for invalid input for `teamsfx new` command. ([#9233](https://github.com/OfficeDev/TeamsFx/pull/9233))

### Apr 18, 2023

New features:

- Run and debug Teams bot and message extension applications with dev tunnels in Visual Studio Code. Refer to [this doc](https://aka.ms/teamsfx-switch-tunnel) if you want to switch back to use ngrok.
  ![devtunnel](https://user-images.githubusercontent.com/11220663/230364699-ed108641-4196-4318-949b-17ff56a6593f.png)

- `Validate Application` now helps catch errors and warnings that would prevent a successful publish to Teams in addition to schema checks.
  ![validate](https://user-images.githubusercontent.com/11220663/230363745-50bb8b6b-06a1-40df-b6ae-5601a71b193e.png)

- Auto-complete suggestions and descriptions when editing `teamsapp.yml` files.

  > Note: Teams Toolkit for Visual Studio Code takes a new dependency on [YAML extension](https://marketplace.visualstudio.com/items?itemName=redhat.vscode-yaml) which will be installed together with Teams Toolkit.

New getting started experience with GitHub Codespaces:

Start developing Teams applications instantly by opening Teams Toolkit samples in GitHub Codespaces. Try these samples today：

- [Hello World Tab Sample](https://github.com/OfficeDev/TeamsFx-Samples/tree/v3/hello-world-tab-codespaces)
- [Notification Sample](https://github.com/OfficeDev/TeamsFx-Samples/tree/v3/notification-codespaces)
- [NPM Search Message Extension Sample](https://github.com/OfficeDev/TeamsFx-Samples/tree/v3/NPM-search-message-extension-codespaces)

SharePoint Framework developer experience update:

- Automated the process to add multiple SPFx web parts as Teams Tab pages and configure the new web parts with Teams app.
- Choose which SharePoint Framework (SPFx) package version to use when creating a SPFx-based Teams tab app, either from a globally installed version or let Teams Toolkit install the latest version for you.
- Streamlined full stack debugging for SPFx based tab apps on Teams, Outlook and the Microsoft 365 app.
  ![SPFx](https://user-images.githubusercontent.com/11220663/230363218-98e16312-17b0-49cf-8617-333ca961c4b0.png)

Teams Toolkit generated project file change:

- Simplified the default lifecycle steps in `teamsapp.yml` to be Provision, Deploy, and Publish. The ConfigureApp and RegisterApp steps are removed, and their actions are defaulted to the Provision step.
- Added support for a new action, `uses: script`, that can be used to run any script command.
- Some actions now support a `writeToEnvironmentFile` parameter to define generated environment variable names.
- `.env.{envName}` files now only contain non-sensitive information and are removed from `.gitignore`.
- Added `.env.{envName}.user` files to store sensitive information like password and are added to `.gitignore`.
  ![project](https://user-images.githubusercontent.com/11220663/230363542-c0e8db66-8b6f-4c0e-92d0-b184c34e4824.png)

Teams Toolkit CLI ([`@microsoft/teamsfx-cli`](https://www.npmjs.com/package/@microsoft/teamsfx-cli)) `v2.0.0@beta`:

- Updated `teamsfx validate` command to validate your app package against validation rules.
- Updated `teamsfx new` command to include a new parameter `--spfx-install-latest-package`  to specify whether to use the latest SPFx package or not.
- Added `teamsfx add spfx-web-part` command to add multiple web parts.

TeamsFx-React SDK ([`@microsoft/teamsfx-react`](https://www.npmjs.com/package/@microsoft/teamsfx-react)) `v3.0.0@beta`:

- Added `BaseDashboard` class: A base component that provides basic functionality to create a dashboard.
- Added `BaseWidget` class: A base component that provides basic functionality to create a widget.
- Added `IWidgetClassNames` Interface: A Interface for defining the class names of widget elements.

Enhancements:

- Updated Teams Toolkit tree view user interface to streamline the development workflow:

  - Added the `ENVIRONMENT` section back.
  - Renamed the `DEPLOYMENT` section to `LIFECYCLE`.
  - Renamed `Provision in the cloud` to `Provision`, `Deploy to the cloud` to `Deploy` and `Publish to Teams` to `Publish`. Now `Provision`, `Deploy` and `Publish` command will trigger the corresponding actions defined in the `teamsapp.yml` file.
  - Moved `Zip Teams App Package`, `Validate Application`, and `Open Developer Portal to Publish` commands to `UTILITY` section.
    ![treeview](https://user-images.githubusercontent.com/11220663/230364045-510c7bd6-5c5a-4b32-ae61-bb069b31c016.png)

- `Zip Teams App Package`, `Validate Application`, `Update Microsoft Entra App`, `Update Teams App` commands will now ask for additional inputs like `manifest.json` file path and environment name so that you have the flexibility to arrange hose files.

- Simplified multiple progress notifications into a single one for provision, deploy and publish.

- Sample: enabled [app caching](https://learn.microsoft.com/microsoftteams/platform/apps-in-teams-meetings/build-tabs-for-meeting?tabs=desktop%2Cmeeting-chat-view-desktop%2Cmeeting-stage-view-desktop%2Cchannel-meeting-desktop#app-caching) in "My First Meeting App" sample that improves subsequent launch time of the apps that are loaded in the meeting side panel.

- Template: updated templates and samples to use Fluent UI V9 and React 18.

Bug fixes:

- Fixed an issue where we will only display relevant how-to guide for SPFx project. ([#8083](https://github.com/OfficeDev/TeamsFx/pull/8083))
- Fixed an issue where the hyperlink is highlighted multiple colors from output channel. ([#8239](https://github.com/OfficeDev/TeamsFx/pull/8239))
- Fixed an issue where you might see duplicate error messages. ([#8213](https://github.com/OfficeDev/TeamsFx/pull/8213))
- Fixed an issue where you might see `Upload failed due to an invalid BotId in your manifest` after migrating your project with prerelease version. ([#8127](https://github.com/OfficeDev/TeamsFx/pull/8127))
- Fixed an issue where `teamsApp/update` action will not create a new Teams app registration when `TEAMS_APP_ID` doesn't exist. ([#8021](https://github.com/OfficeDev/TeamsFx/pull/8021))

### Mar 23, 2023

Enhancement:

- Updated instruction for minimum required version of Outlook in Outlook add-in project template.

### Mar 14, 2023

New features:

- Create, debug, and deploy an [Outlook add-in](https://learn.microsoft.com/office/dev/add-ins/outlook/outlook-add-ins-overview) project.
- Improved debug experience for personal tab and search-based message extension across Microsoft 365 that allows you to automatically run and debug your app in Outlook and the Microsoft 365 app.
- Disabled commands from tree view that doesn't allow concurrent executions. For example, when you execute `Provision in the cloud` command, other commands in the `Deployment` section will be disabled to prevent concurrent execution error.

SDK updates:

- [TeamsFx](https://www.npmjs.com/package/@microsoft/teamsfx) `v2.2.1@beta`: Updated package dependency.
- [TeamsFx-React](https://www.npmjs.com/package/@microsoft/teamsfx-react) `v3.0.0@beta`: Updated package to support React 18 and `useTeams`, `useTeamsFx` and `useTeamsUserCredential` hooks to use `@fluentui/react-components` from Fluent UI v9.

Sample additions:

- `Developer Assist Dashboard`: A dashboard that integrates with Azure DevOps, Github issues and Planner tasks and accelerates developer productivity.
  
  ![devdashboard](https://user-images.githubusercontent.com/11220663/223749194-c83c6788-8138-45ca-a97c-7027a7beafab.png)

- `Hello World Teams Tab and Outlook add-in`: A hello world project that contains both Teams Tab and Outlook add-in capability
  
  ![outlookaddin](https://user-images.githubusercontent.com/11220663/223749477-7dce433b-f569-49ec-b676-9a384e5ad0f1.png)

Bug fixes:

- Fixed an issue where you might see runtime errors on the Teams Toolkit extension page. ([#7887](https://github.com/OfficeDev/TeamsFx/pull/7887))
- Fixed an issue where the app name is not shown properly on the scaffolding success message. ([#7839](https://github.com/OfficeDev/TeamsFx/pull/7839))
- Fixed an issue for several how-to guides that don't point to pre-release compatible versions. ([#7830](https://github.com/OfficeDev/TeamsFx/pull/7830))
- Fixed an [issue 7410](https://github.com/OfficeDev/TeamsFx/issues/7410) where the `Deploy Teams app manifest` option is missing. ([#7755](https://github.com/OfficeDev/TeamsFx/pull/7755))

### Feb 22, 2023

New features:

Updated the fundamental design of Teams Toolkit to make it configurable and transparent as much as possible. The new design allows you to:

- Use existing infrastructure, resource groups, and more when provisioning.
- Use an existing Teams app ID.
- Use an existing Microsoft Entra app registration ID.
- Customizable tunneling solution.
- Add custom steps to debugging, provisioning, deploying, publishing, etc.

Enhancements:

- Removed subscriptions from the sidebar's "ACCOUNTS" section.
- Removed the "ENVIRONMENT" section from the sidebar.
- Removed the "Edit manifest file" button from the sidebar's "DEVELOPMENT" section.
- Added a "Add environment" button to the sidebar's "DEVELOPMENT" section.
- Added a "Manage collaborator" button to the sidebar's "DEVELOPMENT" section.
- Removed `.fx` folder from Teams Toolkit scaffolded templates.
- Moved `template/appPackage` to the root folder for templates.
- Added an `env` folder to manage all `.env` files in template root folders.
- Added an `infra` folder to organize bicep files in template root folders.
- Added `teamsapp.yml` and `teamsapp.local.yml` files to manage configuration and lifecycles in template root folders.
- Flattened the source code file structure for templates. Application code is no longer organized by capability.

Sample addition:

- `Team Central Dashboard`: A dashboard displaying data chats and content from Microsoft Graph to accelerate team collaboration and personal productivity.

  ![dashboard](https://user-images.githubusercontent.com/11220663/223746585-49799058-71ed-4c92-bce0-5aefd26ea3e4.png)

## Frequently asked questions

### What does pre-release mean

Pre-release is meant for those eager to try the latest Teams Toolkit features and fixes. Even though pre-releases are not intended for use in production, they are at a sufficient quality level for you to generally use and [provide feedback](https://aka.ms/ttk-feedback). However, pre-release versions can and probably will change, and those changes could be significant.

### What about my existing Teams Toolkit projects

The changes in this pre-release require upgrades to the TeamsFx configuration files. You can migrate by creating a new project and move your exiting code, or Teams Toolkit have also provided a way to automatically upgrade existing Teams apps that were created with a previous version of Teams Toolkit.

Learn more about the changes in this pre-release at [https://aka.ms/teamsfx-v5.0-guide](https://aka.ms/teamsfx-v5.0-guide).
