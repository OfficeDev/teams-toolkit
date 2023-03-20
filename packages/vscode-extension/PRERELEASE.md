# Teams Toolkit v5.0 Pre-release

## Changelog

### Mar 14, 2023

New features:

- Create, debug, and deploy an [Outlook add-in](https://learn.microsoft.com/office/dev/add-ins/outlook/outlook-add-ins-overview) project.
- Improved debug experience for personal tab and search-based message extension across Microsoft 365 that allows you to automatically run and debug your app in Outlook and the Microsoft 365 app.
- Disabled commands from tree view that doesn't allow concurrent executions. For example, when you execute `Provision in the cloud` command, other commands in the `Deployment` section will be disabled to prevent concurrent execution error.

SDK updates:

- [TeamsFx](https://www.npmjs.com/package/@microsoft/teamsfx) `v2.2.1`: Updated package dependency.
- [TeamsFx-React](https://www.npmjs.com/package/@microsoft/teamsfx-react) `v3.0.0`: Updated package to support React 18 and `useTeams`, `useTeamsFx` and `useTeamsUserCredential` hooks to use `@fluentui/react-components` from Fluent UI v9.

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
