- [3.0.0 - Nov 29 2021](#300---nov-29-2021)
- [2.10.0 - Nov 15 2021](#2100---nov-15-2021)
- [2.9.0 - Nov 01 2021](#290---nov-01-2021)
- [2.8.0 - Oct 18 2021](#280---oct-18-2021)
- [2.7.0 - Sep 17 2021](#270---sep-17-2021)

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
