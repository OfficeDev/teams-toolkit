- [4.0.5 - Aug 22 2022](#405---aug-22-2022)
- [4.0.4 - Aug 09 2022](#404---aug-09-2022)
- [4.0.3 - Jul 26 2022](#403---jul-26-2022)
- [4.0.2 - Jul 12 2022](#402---jul-12-2022)
- [4.0.1 - Jun 16 2022](#401---jun-16-2022)
- [4.0.0 - May 24 2022](#400---may-24-2022)
- [3.8.0 - Apr 22 2022](#380---apr-22-2022)
- [3.7.0 - Apr 06 2022](#370---apr-06-2022)
- [3.6.0 - Mar 21 2022](#360---mar-21-2022)
- [3.5.0 - Mar 07 2022](#350---mar-07-2022)
- [3.4.0 - Feb 21 2022](#340---feb-21-2022)
- [3.3.0 - Feb 07 2022](#330---feb-07-2022)
- [3.2.0 - Jan 10 2022](#320---jan-10-2022)
- [3.1.1 - Dec 27 2021](#311---dec-27-2021)
- [3.1.0 - Dec 13 2021](#310---dec-13-2021)
- [3.0.0 - Nov 29 2021](#300---nov-29-2021)
- [2.10.0 - Nov 15 2021](#2100---nov-15-2021)
- [2.9.0 - Nov 01 2021](#290---nov-01-2021)
- [2.8.0 - Oct 18 2021](#280---oct-18-2021)
- [2.7.0 - Sep 17 2021](#270---sep-17-2021)

# Changelog

## 4.0.5 - Aug 22, 2022

Incremental version for Teams Toolkit with multiple bugs fix, enhancements and a new feature to allow switch Microsoft 365 tenant and Azure subscription for local debugging and cloud provision.

## 4.0.4 - Aug 09, 2022

Incremental version for Teams Toolkit with multiple bugs fix, enhancements and new additions to sample application gallery.

New samples:
- Proactive Messaging: Save users' conversation reference to send proactive reminder messages using bots.

    ![Proactive Messaging](https://raw.githubusercontent.com/OfficeDev/TeamsFx/main/packages/vscode-extension/img/proactive_messaging.png)

- One Productivity Hub: View calendar events, to-do tasks and files in Teams tab.

    ![One Productivity Hub](https://raw.githubusercontent.com/OfficeDev/TeamsFx/main/packages/vscode-extension/img/one_productivity_hub.png)

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

- User can create more business-oriented Teams app template using Teams Toolkit. For example, user can now create not only bot app but also notification bot or command bot. User can see more options are there to choose when create a new Teams app. <br>
 ![manifest preview](https://raw.githubusercontent.com/OfficeDev/TeamsFx/main/packages/vscode-extension/img/scenario-teams-app.png) <br>
- User can create Teams app that can launch and preview in other Microsoft 365 platform like Office.com and Outlook. The options are offered when user create a new Teams app.
- User can incrementally add features to their Teams app using `Add features` in Teams Toolkit during the development process. For example, adding additional Teams extending capability, adding Azure resources like SQL Database or Azure Function etc., adding Single Sign on or API connections and so on.
  ![manifest preview](https://raw.githubusercontent.com/OfficeDev/TeamsFx/main/packages/vscode-extension/img/add-features.png) <br>
- User can preview the Teams manifest file and only deploy the manifest file without deploy the whole project.
  ![manifest preview](https://raw.githubusercontent.com/OfficeDev/TeamsFx/main/packages/vscode-extension/img/deploy-manifest.png) <br>
- User can customized Azure AD manifest file.
- Add tutorials in the Teams Toolkit, user can find them by typing the command `Teams: View Guided Tutorials` in the command palette (Ctrl+Shift+P).
  ![manifest preview](https://raw.githubusercontent.com/OfficeDev/TeamsFx/main/packages/vscode-extension/img/tutorials-in-ttk.png) <br>
- A new sample which use Graph Connector get on board to the Sample Gallery. Click `View Samples` in Teams Toolkit to browse Sample Gallery.
  ![manifest preview](https://raw.githubusercontent.com/OfficeDev/TeamsFx/main/packages/vscode-extension/img/graph-connector-app.png) <br>

Enhancement:

- UI improvement of `Create a new Teams app` and `Start from a sample`.
- UI improvement of the Teams Toolkit menus in the sidebar.
- Optimize and simplify the Sample apps. Improve the experience of Sample apps.
- Improved the experience of TeamsFx CLI tool. 

## 3.8.0 - Apr 22, 2022

Incremental version for Teams Toolkit with multiple bugs fixes and the following updates:

Enhancement:
- Optimize the configuration schema and manifest template of project created by Teams Toolkit.
- Support to use CodeLens to preview variables value in manifest template file. <br>
 ![manifest preview](https://raw.githubusercontent.com/OfficeDev/TeamsFx/main/packages/vscode-extension/img/manifest-codelens-preview.png) <br>
- Optimize the In-meeting Sample App in sample gallery, shorten the time to run the sample.
- Improved  "Start from a sample" UI, show more information of each sample.

## 3.7.0 - Apr 06, 2022
Incremental version for Teams Toolkit with multiple bugs fixes and the following updates:

New Features:
- Provide multiple entry points of creating testing tenant/accounts to unblock user from Microsoft 365 account issues, like Microsoft 365 account does not have sideloading permission or user does not have Microsoft 365 account at all. These entry points include: <br>
	a). an Add(+) button besides ACCOUNTS in sidebar <br>
	![ITP in sidebar](https://raw.githubusercontent.com/OfficeDev/TeamsFx/main/packages/vscode-extension/img/create-itp-sidebar.png) <br>
	b). an new "Create an account" option in `Teams: Accounts` Command <br>
	![ITP in command](https://raw.githubusercontent.com/OfficeDev/TeamsFx/main/packages/vscode-extension/img/create-itp-command.png) <br>
	c). improved Get Started page <br>
	![ITP in get started page](https://raw.githubusercontent.com/OfficeDev/TeamsFx/main/packages/vscode-extension/img/create-itp-getstart.png) <br>

Enhancement:
- Improved SPFx Project scaffolding experience by using Yeoman Generator. 

## 3.6.0 - Mar 21, 2022
Incremental version for Teams Toolkit with multiple bugs fixes and the following updates:

New Features:
- Optimized Get Started page for Teams Toolkit. User can check environment prerequisites from Get started now.

	![new get started page](https://raw.githubusercontent.com/OfficeDev/TeamsFx/main/packages/vscode-extension/img/get_start.png)
	
- User can use Teams Toolkit to create workflow automation templates for Github, Azure DevOps and Jenkins.

	![cicd workflow](https://raw.githubusercontent.com/OfficeDev/TeamsFx/main/packages/vscode-extension/img/cicd_workflow.png)

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
    ![key vault integration](https://raw.githubusercontent.com/OfficeDev/TeamsFx/main/packages/vscode-extension/img/key_vault.gif)

- View state file and edit environment configurations from manifest with code lens.
    ![manifest code lens](https://raw.githubusercontent.com/OfficeDev/TeamsFx/main/packages/vscode-extension/img/manifest_code_lens.gif)

## 3.0.0 - Nov 29, 2021

Major version for Teams Toolkit with new features to support cloud resources customization, multiple cloud environments, collaborations and some bug fix.

New Features:

- Adopt ARM templates to provision Azure cloud resources, support customization of cloud resources. Refer to [Provision cloud resources](https://aka.ms/provision-doc) for more information.
- Developers can create and manage multiple cloud environments with different customizations for each environment. Refer to [Manage multiple environment](https://aka.ms/multi-env-doc) for more information.

    ![create multiple environments](https://raw.githubusercontent.com/OfficeDev/TeamsFx/main/packages/vscode-extension/img/create-env.png)

- Developers can collaborate with others on the same project. Refer to [Collaborations in Teams Toolkit](https://aka.ms/ttk-collaboration-doc) for more information.
    
    ![Collaborate with others](https://raw.githubusercontent.com/OfficeDev/TeamsFx/main/packages/vscode-extension/img/collaboration.png)

- Support manifest customization for both local and remote environment. Refer to [Customize manifest](https://aka.ms/customize-manifest-doc) for more information.
- Provide flexibility to add cloud resources to your project using ARM template. Refer to [Add cloud resources](https://aka.ms/add-resources-doc) for more information.
      
    ![Add cloud resources](https://raw.githubusercontent.com/OfficeDev/TeamsFx/main/packages/vscode-extension/img/add-resource.png)

- Add more Teams Sample Apps which support local run with no need to manually set up environment.

Enhancement:

- Improve UI: In sample gallery, add time and effort estimation for each sample.

    ![Sample gallery UI](https://raw.githubusercontent.com/OfficeDev/TeamsFx/main/packages/vscode-extension/img/sample-ui.png)

- Improve UI: multiple enhancement to the Tree View. For example, provide documents links in Tree View, and enrich the tooltip descriptions.
- Reduce the required user inputs in order to create new project.
- Enhance the status and messages showed in Teams Toolkit.
- Upgrade samples to adopt new features in Teams Toolkit.

## 2.10.0 - Nov 15, 2021 

Incremental version for Teams Toolkit with multiple bugs fixes and the following updates:

New Features:
- Enable developers with the capability to extend Teams apps to run across Microsoft 365. Developers can invoke two important commands from VS Code Command Palette to upgrade their Teams app to Microsoft 365 custom app. Get detail instructions from our [documentation](https://aka.ms/teamsfx-extend-m365). 

  ![Alt Text](https://raw.githubusercontent.com/OfficeDev/TeamsFx/main/packages/vscode-extension/img/teamsfx-extend-m365.png)
  
- Provide Teams sample apps which can run across Microsoft 365. Users can get a initial experience of running Teams apps in Microsoft 365 by playing with samples first. Developers can get the samples from sample gallery, or click `Create a new Teams app` -> `Start from a sample`, and select sample apps for Microsoft 365.

 ![Alt Text](https://raw.githubusercontent.com/OfficeDev/TeamsFx/main/packages/vscode-extension/img/M365sample2.png)
 
 ![Alt Text](https://raw.githubusercontent.com/OfficeDev/TeamsFx/main/packages/vscode-extension/img/M365sample1.png)

## 2.9.0 - Nov 01, 2021 

Incremental version for Teams Toolkit with multiple bugs fixes and the following updates:

Preview Features:
- Enable CI/CD for multiple environments scenario.
- Insider Preview features in 2.8.0 release are still in preview. Refer to [Enable insider preview featuers](https://github.com/OfficeDev/TeamsFx/wiki/Enable-Preview-Features-in-Teams-Toolkit) for how to use.
- Upgrade existing projects to support preview features, refer to [Upgrade existing project to use latest features](https://github.com/OfficeDev/TeamsFx/wiki/Upgrade-project-to-use-latest-Toolkit-features) for more information.

Enhancement:

- Improve UI: more friendly user experience to create a new Teams project.
- Improve UI: add links to source code for samples.
- Support one-click deployment of SharePoint framework based Teams app.
- Integrate Adaptive Card Studio with previewing and debugging Adaptive Card in VS Code.

  ![Alt Text](https://raw.githubusercontent.com/OfficeDev/TeamsFx/main/packages/vscode-extension/img/adaptive-card.gif)

## 2.8.0 - Oct 18 2021

Incremental version for Teams Toolkit with multiple bugs fixes and the following updates:

Preview Features:
- Support management of multiple environments.

  ![Alt Text](https://raw.githubusercontent.com/OfficeDev/TeamsFx/main/packages/vscode-extension/img/multi-env.gif)

- Support project collaborations among multiple developers.

  ![Alt Text](https://raw.githubusercontent.com/OfficeDev/TeamsFx/main/packages/vscode-extension/img/addCollaborator.png)

- Improve the experience to customize Azure resource provision using ARM(Azure Resource Manager).

The picture below shows how to enable preview features, more details refer to the [preview guidance](https://github.com/OfficeDev/TeamsFx/wiki/Enable-Preview-Features-in-Teams-Toolkit)

![Alt Text](https://raw.githubusercontent.com/OfficeDev/TeamsFx/main/packages/vscode-extension/img/enable-preview.gif)

Enhancement:

- Improve UI: making the Tree View and Command Pallete text consistent.
- UX A/B testing:
  - Your Tree View(sidebar) may include or exclude quick start page.
  - You may or may not be invited to do local debug after create new project.

## 2.7.0 - Sep 17 2021

Incremental version for Teams Toolkit with multiple bugs fixed and the following updates：

![Alt Text](https://raw.githubusercontent.com/OfficeDev/TeamsFx/main/packages/vscode-extension/img/sample.gif)

Enhancement:

- Improved version upgrade experience by adding "What is New?" info.
- Simplified welcome view when clicking the Toolkit logo on the sidebar.
