# Changelog

## 4.0.5 - Aug 22, 2022

Incremental version for Teams Toolkit with multiple bugs fix, enhancements and a new feature to allow switch Microsoft 365 tenant and Azure subscription for local debugging and cloud provision.

## 4.0.4 - Aug 09, 2022

Incremental version for Teams Toolkit with multiple bugs fix, enhancements and new additions to sample application gallery.

New samples:
- Proactive Messaging: Save users' conversation reference to send proactive reminder messages using bots.
- One Productivity Hub: View calendar events, to-do tasks and files in Teams tab.

Enhancement:
- Enhanced experience of building Teams tab application with SharePoint Framework v1.15.0

## 4.0.3 - Jul 26, 2022

Incremental version for Teams Toolkit with multiple bugs fix and enhancements.

Enhancement:

- User can now switch Azure account or Azure subscription to provision cloud resource.
- Now support SPFx version to v1.15.0.

## 4.0.2 - Jul 12, 2022

Incremental version for Teams Toolkit with multiple bugs fix and enhancements.

## 4.0.1 - Jun 16, 2022

Incremental version for Teams Toolkit with multiple bugs fix and enhancements.

## 4.0.0 - May 24, 2022

Major version for Teams Toolkit with new features to support more Teams app scenario like notification bot and command bot. What's more, this version adds support to extend Teams app across Microsoft 365 platform like Office.com and Outlook.

New Features:

- User can create more business-oriented Teams app template using Teams Toolkit. For example, user can now create not only bot app but also notification bot or command bot. User can see more options are there to choose when create a new Teams app.
- User can create Teams app that can launch and preview in other Microsoft 365 platform like Office.com and Outlook. The options are offered when user create a new Teams app.
- User can incrementally add features to their Teams app using `Add features` in Teams Toolkit during the development process. For example, adding additional Teams extending capability, adding Azure resources like SQL Database or Azure Function etc., adding Single Sign on or API connections and so on.
- User can preview the Teams manifest file and only deploy the manifest file without deploy the whole project.
- User can customized Azure AD manifest file.
- Add tutorials in the Teams Toolkit, user can find them by typing the command `Teams: View Guided Tutorials` in the command palette (Ctrl+Shift+P).
- A new sample which use Graph Connector get on board to the Sample Gallery. Click `View Samples` in Teams Toolkit to browse Sample Gallery.

Enhancement:

- UI improvement of `Create a new Teams app` and `Start from a sample`.
- UI improvement of the Teams Toolkit menus in the sidebar.
- Optimize and simplify the Sample apps. Improve the experience of Sample apps.
- Improved the experience of TeamsFx CLI tool. 

## 3.8.0 - Apr 22, 2022

Incremental version for Teams Toolkit with multiple bugs fixes and the following updates:

Enhancement:
- Optimize the configuration schema and manifest template of project created by Teams Toolkit.
- Support to use CodeLens to preview variables value in manifest template file.
- Optimize the In-meeting Sample App in sample gallery, shorten the time to run the sample.
- Improved  "Start from a sample" UI, show more information of each sample.

## 3.7.0 - Apr 06, 2022
Incremental version for Teams Toolkit with multiple bugs fixes and the following updates:

New Features:
- Provide multiple entry points of creating testing tenant/accounts to unblock user from Microsoft 365 account issues, like Microsoft 365 account does not have sideloading permission or user does not have Microsoft 365 account at all. These entry points include an Add(+) button besides ACCOUNTS in sidebar, an new "Create an account" option in `Teams: Accounts` Command and improved Get Started page.

Enhancement:
- Improved SPFx Project scaffolding experience by using Yeoman Generator. 

## 3.6.1 - Mar 23, 2022
Hotfix version for Teams Toolkit with multiple bugs fixed.

## 3.6.0 - Mar 21, 2022
Incremental version for Teams Toolkit with multiple bugs fixes and the following updates:

New Features:
- Optimized Get Started page for Teams Toolkit. User can check environment prerequisites from Get started now.
- User can use Teams Toolkit to create workflow automation templates for Github, Azure DevOps and Jenkins.

Enhancement:
- Enhance TeamsFx SDK.

## 3.5.0 - Mar 07, 2022
Incremental version for Teams Toolkit with multiple bugs fixes and the following updates:

New Features:
- New sample app - Teams tab app without SSO.

Enhancement:
- Teams tab app generated from "create a new Teams app" can now use graph toolkit to retrieve user data.

## 3.4.0 - Feb 21, 2022
Incremental version for Teams Toolkit with multiple bugs fixes and the following updates:

Enhancement:
- Improved local debug experience, more light weighted and more graceful.

## 3.3.0 - Feb 07, 2022
Incremental version for Teams Toolkit with multiple bugs fixes and the following updates:

New Features:
- "Add cloud resources" feature now supports adding multiple instances of the same cloud resource type. For example, add multiple instance of SQL DB at the same time.
	
Enhancement:
 - Teams Tab project created by Teams Toolkit now is updated to use Auth Code Flow with PKCE for SPA authentication. You can find more details [here](https://aka.ms/teamsfx-auth-code-flow). Please be noted that Tab project created by Teams Toolkit of this version will not be supported by previous versions of Teams Toolkit.

## 3.2.0 - Jan 10, 2022
Incremental version for Teams Toolkit with multiple bugs fixes and the following updates:

New Features:
- Use Service Principle to login Azure account in CICD template.
- Support building React Tab app by different environment variables for multiple environments.

Enhancement:
- Provide guidance to install development certificate on WSL. See guidance [here](https://github.com/OfficeDev/TeamsFx/blob/dev/docs/fx-core/localdebug-help.md#how-to-manually-install-the-development-certificate-for-windows-subsystem-for-linux-wsl-users)
- Support .NET SDK 6.0.
- Improve the experience to preview manifest file and update manifest file to Developer Portal.
- Improve CICD template by reducing dependency on project metadata file.

## 3.1.1 - Dec 27, 2021
This is a hotfix version.

The Azure App service is upgraded and does not support some older NodeJs versions in some regions any more. This hotfix solves the problem that Azure App service is not working in those regions which does not support older NodeJs versions.

## 3.1.0 - Dec 13, 2021
Incremental version for Teams Toolkit with multiple bugs fixes and the following updates:

New Features:
- Integrate with Azure Key Vault to secure your application secrets at runtime.
- View state file and edit environment configurations from manifest with code lens.

Enhancement:
- Support Node.js 16 and NPM 7 except for SPFx based tab application or projects including Azure Functions.

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
- Check permission to turn-on Teams custom app uploading when user sign-in to Microsoft 365 account. Learn more about [Teams app uploading or sideloading permission](https://docs.microsoft.com/en-us/microsoftteams/platform/concepts/build-and-test/prepare-your-o365-tenant#enable-custom-teams-apps-and-turn-on-custom-app-uploading).
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
- new sign-in experience for Microsoft 365 and Azure
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
