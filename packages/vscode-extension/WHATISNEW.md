- [2.10.0 - Nov 15 2021](#2100---nov-15-2021)
- [2.9.0 - Nov 01 2021](#290---nov-01-2021)
- [2.8.0 - Oct 18 2021](#280---oct-18-2021)
- [2.7.0 - Sep 17 2021](#270---sep-17-2021)

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
