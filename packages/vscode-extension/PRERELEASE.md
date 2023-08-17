# Teams Toolkit Pre-release

## Changelog

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

- `Zip Teams App Package`, `Validate Application`, `Update Azure Active Directory App`, `Update Teams App` commands will now ask for additional inputs like `manifest.json` file path and environment name so that you have the flexibility to arrange hose files.

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
- Use an existing Azure Active Directory app registration ID.
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
