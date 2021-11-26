# Changelog

## 3.0.0 - Nov 29, 2021
Major version for Teams Toolkit with new features to support cloud resources customization, multiple cloud environments, collaborations and some bug fix.

New Features:
- Adopt ARM templates to provision Azure cloud resources, support customization of cloud resources. Refer to [Provision cloud resources](https://aka.ms/provision-doc) for more information.
- Developers can create and manage multiple cloud environments with different customizations for each environment. Refer to [Manage multiple environment](https://aka.ms/multi-env-doc) for more information.
- Developers can collaborate with others on the same project. Refer to [Collaborations in Teams Toolkit](https://aka.ms/collaboration-doc) for more information.
- Support manifest customization for both local and remote environment. Refer to [Customize manifest](https://aka.ms/customize-manifest-doc) for more information.
- Provide flexibility to add cloud resources to your project using ARM template. Refer to [Add cloud resources](https://aka.ms/add-resources-doc) for more information.
- Add more Teams Sample Apps which support local run with no need to manually set up environment.

Enhancement:
- Improve UI: In sample gallery, add time and effort estimation for each sample.
- Improve UI: multiple enhancement to the Tree View. For example, provide documents links in Tree View, and enrich the tooltip descriptions.
- Reduce the required user inputs in order to create new project.
- Enhance the status and messages showed in Teams Toolkit.
- Upgrade samples to adopt new features in Teams Toolkit.

## 2.10.0 - Nov 15, 2021 

Incremental version for Teams Toolkit with multiple bugs fixes and the following updates:

New Features:
- Enable developers with the capability to extend Teams apps to run across Microsoft 365, get instructions from our [documentation](https://aka.ms/teamsfx-extend-m365). 
- Provide Teams sample apps "Todo List (Works in Teams, Outlook and Office)" and "NPM Search Connector" which can run across Microsoft 365. Users can get an initial experience of running Teams apps in Microsoft 365.

## 2.9.0 - Nov 01, 2021 

Incremental version for Teams Toolkit with multiple bugs fixes and the following updates:

Preview Features:
- Enable CI/CD for multiple environments scenario.
- Insider Preview features in 2.8.0 release are still in preview. Refer to [Enable insider preview features](https://github.com/OfficeDev/TeamsFx/wiki/Enable-Preview-Features-in-Teams-Toolkit) for how to use.
- Upgrade existing projects to support preview features, refer to [Upgrade existing project to use latest features](https://github.com/OfficeDev/TeamsFx/wiki/Upgrade-project-to-use-latest-Toolkit-features) for more information.

Enhancement:

- Improve UI: more friendly user experience to create a new Teams project.
- Improve UI: add links to source code for samples.
- Support one-click deployment of SharePoint framework based Teams app.
- Integrate Adaptive Card Studio with previewing and debugging Adaptive Card in VS Code.


## 2.8.0 - Oct 18, 2021

Incremental version for Teams Toolkit with multiple bugs fixes and the following updates:

Preview Features:
- Support management of multiple environments.
- Support project collaborations among multiple developers.
- Improve the experience to customize Azure resource provision using ARM(Azure Resource Manager).

To enable the preview features, refer to the [preview guidance](https://github.com/OfficeDev/TeamsFx/wiki/Enable-Preview-Features-in-Teams-Toolkit)

Enhancement:

- Improve UI: making the Tree View and Command Pallete text consistent.
- UX A/B testing:
  - Your Tree View(sidebar) may include or exclude quick start page.
  - You may or may not be invited to do local debug after create new project.

## 2.7.0 - Sep 17, 2021

Incremental version for Teams Toolkit with multiple bugs fixes and the following updates:

Enhancement:

- Improved version upgrade experience by adding "What is New?" info.
- Simplified welcome view when clicking the Toolkit logo on the sidebar.

## 2.6.0 - Sep 06, 2021

Incremental version for Teams Toolkit with multiple bugs fixed and the following updates：

New Feature:

- Support projects migration from Teams Toolkit V1 to V2. If your Teams projects are created using Teams Toolkit V1, try migrate your project follow the [migration instructions](https://aka.ms/teamsfx-migrate-v1).
- Support local debug experience for Teams Tab/Bot/Messaging extension project migrated from Teams Toolkit V1.
- Check permission to turn-on Teams custom app uploading when user sign-in to M365 account. Learn more about [Teams app uploading or sideloading permission](https://docs.microsoft.com/en-us/microsoftteams/platform/concepts/build-and-test/prepare-your-o365-tenant#enable-custom-teams-apps-and-turn-on-custom-app-uploading).
- (Preview Feature) Support provision cloud resources using Azure Resource Manager. To enable this feature, please follow [instructions](https://github.com/OfficeDev/TeamsFx/wiki/Enable-Preview-Features-in-Teams-Toolkit).

Enhancement:

- UI Enhancement:
  - Hide Azure account login for SharePoint projects.
  - Tree View A/B testing: with non-Teams projects open, you may randomly see either one of two different Tree View layouts in the side bar.
- Optimization of created project folder structure.
- Improved getting start experience of creating new project for Bot.
- Upgrade Sample apps. Enable CI/CD workflow for Todo-List with Azure backend sample. More samples are coming, view them at [Sample GitHub open source repo](https://github.com/OfficeDev/TeamsFx-samples)

## 2.5.0 - Aug 23 2021

Incremental version for Teams Toolkit with multiple bugs fixed and the following updates：

New Feature:

- Enable create project from quick start page.
- Enable report issue from local debug pop-up error message.
- Enable CI/CD workflow with Github Actions. Check [CI/CD instructions](https://github.com/OfficeDev/TeamsFx/tree/dev/docs/cicd) to learn how to use.

Enhancement:

- Update new CLI progress bar.
- Improve some UI experience.
- Add more information in the output error message of debug.

## 2.4.1 - Aug 10 2021

Incremental version for Teams Toolkit with multiple bugs fixed and the following updates：

New Feature:

- Add extension accessiblity for the disabled.
- Add CLI command 'teamsfx preview' to preview SPFx apps.

Enhancement:

- A/B testing for Tree View design. You may randomly see either one of two different Tree View layouts in the side bar.

## 2.3.1 - July 26 2021

Incremental version for Teams Toolkit with multiple bugs fixed and the following updates：

New Feature:

- Add CLI command 'teamsfx preview' to directly preview Teams apps after scaffolding.
- For multiple developers collaborate on one project, Teams Toolkit enables developers to create their own local environment by pressing F5.
- Add encryption to secret data in .userdata file, and support view/edit secret data through VS Code UI and CLI tool.

Enhancement:

- Speed up the installation of npm dependency for debugging experience.

## 2.2.0 - July 12 2021

Incremental version for Teams Toolkit with following updates：

Added:

- UI Run button for debug and preview
- Provide 'Report Issue' button in the pop-up error message to log issues when npm install fails or system error occurs
- A/B testing:  
  Please be noted that in this release we are conducting A/B testing for 'Tree View', the left panel of Teams Toolkit. Thus you may see different layout of Tree View, that is not an issue but totally by design.

## 2.1.1 - June 30 2021

Multiple bug fixings

## 2.1.0 - June 15 2021

Incremental version for Teams Toolkit with the following updates:

Added:

- enable customer survey from toolkit
- add FAQ plus to the samples
- better local debug experience

## 2.0.1 - May 25 2021

2.0.1 is a major version upgrade for Teams Toolkit with many new improvements and supports.

Added:

- new design of UI and command palette list
- new getting started guide, samples and doc link from toolkit
- new sign-in experience for M365 and Azure
- new interactive flow for creating new app
- add messaging extension capability to Teams app
- sample codes for in-meeting app.
- support e2e dev experience for tab app hosted by either Azure or SPFx
- support adding backend API (Azure Functions) and SQL DB to tab app
- preview support for tab app, bot app, and messaging extension
- dev environment checking and auto-setup
- cloud provision and deploy for Teams app from treeview UI and command palette
- support simplified auth code and graph client through scaffolding
- Mac/Linux support of new toolkit
- integration with GitHub Codespaces for dev/test

Enhanced:

- improved helloworld app through scaffolding for tab app, bot app, and messaging extension
- imoroved local frontend/backend debugging support for tab app, bot app, and messaging extension
- improved error messages and logging
- improved publish to teams flow

Fixed:

- cumulated bug fixes

## 1.2.3 - April 20 2021

- Add scaffold option for a Teams messaging extension with SSO (Single Sign-on)

## 1.2.2 - April 1 2021

- Increase the timout limit when creating an AAD password for a bot registration.

## 1.2.1 - March 15 2021

- Bug fix for env/manifest file automatic replacements not happening for some scaffolds.
- Bug fix for AAD app creation where consent should be admin and users and not just admin.

## 1.2.0 - March 2021

- Pull scaffolds from public github repository for always up to date content.
- Updated scaffold selection wizard with more details on what is available.
- More scaffolding and language options.
- Publishing package support when manifest.json is updated locally the zip and cloud configuration in App Studio is created/updated.
- New scaffolds repository https://github.com/OfficeDev/Microsoft-Teams-Samples

## 1.1.8 - 9 Dec 2020

- Azure AD single sign-on bug fixes for Group tabs

## 1.1.4 - 1 Dec 2020

- Azure AD single sign-on documentation updates
- Bug fixes

## 1.1.3 - 24 Nov 2020

- Azure AD single sign-on scaffolding for Tab apps
- Download application publishing package from VS Code
- Bug fixes

## 1.1.1 & 1.1.2

- Bug fixes

## 1.1.0 - 27 Oct 2020

- Onboard to the new VS Code auth
- New F5
- Deprecation of .publish folder - all updates you do through App Studio tooling
- Pre 1.1.0 project upgrade to new project format. We detect if they don't have a teamsAppId in the project...and if they have a .publish folder we create an app registration for them and update the project.
- New bot creation wizard updates
- New project creation flow
- Bug fixes

## 1.0.4 - 3 Aug 2020

Publish to your org catalog from the toolkit

## 1.0.2 - 15 Jul 2020

Bug fixes

## 1.0.1 - 10 Jul 2020

Quality improvements

## 1.0.0 - 7 Jul 2020

Bug fixes

## 0.9.6 - 30 June 2020

Added

- A new bot service instance is automatically created in Azure when a bot/messaging extension project is provisioned and requires one.
- Run your project in the Teams client by hitting F5.

## 0.9.5 - 19 May 2020

Extension released in preview.
