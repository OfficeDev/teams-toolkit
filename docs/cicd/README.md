# CI/CD Support for Teams Application Developers

TeamsFx helps automate your development workflow when building a Teams application. This document provides tools and pre-cooked templates for you to get started when setting up CI/CD pipelines with the most popular development platforms including Github, Azure DevOps and Jenkins.

> Note:
If your project is using the insider features (ARM, Multiple Environments), Please look for CICD instructions in [this link](https://aka.ms/teamsfx-cicd-insider-guide).

|Tools and Templates|Description|
|---|---|
|[teamsfx-cli-action](https://github.com/OfficeDev/teamsfx-cli-action)|A ready-to-use GitHub Action that integrates with TeamsFx CLI.|
|[github-ci-template.yml](https://github.com/OfficeDev/TeamsFx/blob/main/docs/cicd/github-ci-template.yml) and [github-cd-template.yml](https://github.com/OfficeDev/TeamsFx/blob/main/docs/cicd/github-cd-template.yml)| GitHub CI/CD templates for a Teams app. |
|[jenkins-ci-template.Jenkinsfile](https://github.com/OfficeDev/TeamsFx/blob/main/docs/cicd/jenkins-ci-template.Jenkinsfile) and [jenkins-cd-template.Jenkinsfile](https://github.com/OfficeDev/TeamsFx/blob/main/docs/cicd/jenkins-cd-template.Jenkinsfile)|Jenkins CI/CD templates for a Teams app.|
|[script-ci-template.sh](https://github.com/OfficeDev/TeamsFx/blob/main/docs/cicd/others-script-ci-template.sh) and [script-cd-template.sh](https://github.com/OfficeDev/TeamsFx/blob/main/docs/cicd/others-script-cd-template.sh)| Script templates for automation everywhere else outside of GitHub. |

## Setup CI/CD Pipelines with GitHub
To include CI/CD workflows to automate Teams app development process in github, you need to:
1. Create a folder under `.github/workflows`
1. Copy the template files (either one or both of them)
    1. [github-ci-template.yml](https://github.com/OfficeDev/TeamsFx/blob/main/docs/cicd/github-ci-template.yml) for CI workflow
    1. [github-cd-template.yml](https://github.com/OfficeDev/TeamsFx/blob/main/docs/cicd/github-cd-template.yml) for CD workflow
1. Customize these workflows to fit your scenarios.

### Customize CI Workflow
There are some changes you can make to adapt the workflow for your project:

1. Change how the CI flow is triggered. We default to when a pull request is created targeting the `dev` branch.
1. Use a npm build script, or customize the way you build the project in the automation code.
1. Use a npm test script which returns zero for success, and/or change the test commands.

### Customize CD Workflow
You may want to change:
1. How the CD flow is triggered. By default it happens when new commits are made to the `main` branch.
1. Create GitHub [repository secrets](https://docs.github.com/en/actions/reference/encrypted-secrets) by environment to securely store Azure and M365 login credentials. The table below lists all the secrets you need to create on GitHub, and for detailed usage, please refer to the GitHub Actions [README.md](https://github.com/OfficeDev/teamsfx-cli-action/blob/main/README.md).
1. Change the build scripts if necessary.
1. Remove the test scripts if you don't have tests.

> Note: The provision step is not included in the CD template as it's usually executed only once. You can either execute provision Within Teams Toolkit, TeamsFx CLI, or using a seperated workflow. Please remember to commit after provisioning (results of provisioning will be deposited inside the `.fx` folder) and save the file content of `default.userdata` into GitHub [repository secrets](https://docs.github.com/en/actions/reference/encrypted-secrets) with name `USERDATA_CONTENT` for future usage.

### Environment Variables
Steps to create environment variables in GitHub:
1. In the project `Settings` page, navigate to `Environments` section and click `New environment`.
1. Enter a name for your environment. The default environment name provided in the template is `test_environment`. Click `Configure environment` to proceed.
1. In the next page, click `Add Secret` to add secrets for each of the items listed in the table below.

|Name|Description|
|---|---|
|AZURE_ACCOUNT_NAME|The account name of Azure which is used to provision resources.|
|AZURE_ACCOUNT_PASSWORD|The password of Azure account.|
|AZURE_SUBSCRIPTION_ID|To identify the subscription in which the resources will be provisioned.|
|AZURE_TENANT_ID|To identify the tenant in which the subscription resides.|
|M365_ACCOUNT_NAME|The M365 account for creating and publishing the Teams App.|
|M365_ACCOUNT_PASSWORD|The password of the M365 account.|
|M365_TENANT_ID|To identify the tenant in which the Teams App will be created/published. This value is optional unless you have a multi-tenant account and you want to use another tenant. Read more on [how to find your M365 tenant ID](https://docs.microsoft.com/en-us/azure/active-directory/fundamentals/active-directory-how-to-find-tenant).|
> Note: Please refer to the [Configure M365/Azure Credentials](https://github.com/OfficeDev/teamsfx-cli-action/blob/main/README.md#configure-m365azure-credentials-as-github-secret) to make sure you have disabled Multi-factor Authentication and Security Defaults for the credentials used in the workflow.

## Setup CI/CD Pipelines with Azure DevOps

You can set up automated pipelines in Azure DevOps, and make a reference on the scripts and steps below to get started:
* [CI Scripts](https://github.com/OfficeDev/TeamsFx/blob/main/docs/cicd/others-script-ci-template.sh)
* [CD Scripts](https://github.com/OfficeDev/TeamsFx/blob/main/docs/cicd/others-script-cd-template.sh)

### Set up CI Pipeline
1. Add [CI Scripts](https://github.com/OfficeDev/TeamsFx/blob/main/docs/cicd/others-script-ci-template.sh) into your Azure DevOps repository, and customize it as needed to fit your requirements.
1. Follow the [steps to create your Azure DevOps Pipeline for CI](https://docs.microsoft.com/en-us/azure/devops/pipelines/create-first-pipeline?view=azure-devops&tabs=java%2Ctfs-2018-2%2Cbrowser#create-your-first-pipeline-1). 

Here is an example of a common CI pipeline scripts:

```
trigger:
- dev 

pool:
  vmImage: ubuntu-latest

steps:
- task: NodeTool@0
  inputs:
    versionSpec: '14.17.0'
    checkLatest: true
  
- task: Bash@3
  inputs:
    filePath: './others-script-ci-template.sh'
```

The potential changes you can make for the script or workflow definition:
1. Change how the CI flow is triggered. We default to when a new commit is pushed into the `dev` branch.
1. Change the way of how to install node and npm.
1. Use a npm build script, or customize the way you build in the automation code.
1. Use a npm test script which returns zero for success, and/or change the test commands.

### Set up CD Pipeline
1. Add [CD Scripts](https://github.com/OfficeDev/TeamsFx/blob/main/docs/cicd/others-script-cd-template.sh) into your Azure DevOps repository, and do necessary customizations as you may infer from the comments in the script file.
1. Follow the steps to [create your Azure DevOps Pipeline for CD Pipeline.](https://docs.microsoft.com/en-us/azure/devops/pipelines/create-first-pipeline?view=azure-devops&tabs=java%2Ctfs-2018-2%2Cbrowser#create-your-first-pipeline-1). 
1. Add secrect variables using [Define variables](https://docs.microsoft.com/en-us/azure/devops/pipelines/process/variables?view=azure-devops&tabs=yaml%2Cbatch).

Here is an example of a common CD pipeline scripts:

```
trigger:
- main 

pool:
  vmImage: ubuntu-latest

steps:
- task: NodeTool@0
  inputs:
    versionSpec: '14.17.0'
    checkLatest: true

- task: DownloadSecureFile@1
  name: userdata
  inputs:
    secureFile: 'default.userdata'
- task: Bash@3
  inputs:
    targetType: 'inline'
    script: |
      cp $(userdata.secureFilePath) .fx/default.userdata
  
- task: Bash@3
  env:
    AZURE_ACCOUNT_NAME: $(AZURE_ACCOUNT_NAME)
    AZURE_ACCOUNT_PASSWORD: $(AZURE_ACCOUNT_PASSWORD)
    AZURE_SUBSCRIPTION_ID: $(AZURE_SUBSCRIPTION_ID)
    AZURE_TENANT_ID: $(AZURE_TENANT_ID)
    M365_ACCOUNT_NAME: $(M365_ACCOUNT_NAME)
    M365_ACCOUNT_PASSWORD: $(M365_ACCOUNT_PASSWORD)
  inputs:
    filePath: './others-script-cd-template.sh'
```

The potential changes you can make for the script or workflow definition:
1. How the CD flow is triggered. By default it happens when new commits are made to the `main` branch.
1. Change the way of how to install node and npm.
1. Ensure you have a npm build script, or customize the way you build in the automation code.
1. Ensure you have a npm test script which returns zero for success, and/or change the test commands.

> Note: The provision step is not included in the CD template as it's usually executed only once. You can either execute provision Within Teams Toolkit, TeamsFx CLI, or using a seperated workflow. Please remember to commit after provisioning (results of provisioning will be deposited inside the `.fx` folder) and upload `.fx/default.userdata` into Azure DevOps [secure files](https://docs.microsoft.com/en-us/azure/devops/pipelines/library/secure-files?view=azure-devops) for future usage.

### Environment Variables
Steps to create Pipeline variables in Azure DevOps:
1. In the Pipeline editing page, click `Variables` on top right and click `New variable`.
1. Enter Name/Value pair for your variable.
1. Toggle the checkbox of `Keep this value secret` if necessary.
1. Click `OK` to create the variable. 

|Name|Description|
|---|---|
|AZURE_ACCOUNT_NAME|The account name of Azure which is used to provision resources.|
|AZURE_ACCOUNT_PASSWORD|The password of Azure account.|
|AZURE_SUBSCRIPTION_ID|To identify the subscription in which the resources will be provisioned.|
|AZURE_TENANT_ID|To identify the tenant in which the subscription resides.|
|M365_ACCOUNT_NAME|The M365 account for creating and publishing the Teams App.|
|M365_ACCOUNT_PASSWORD|The password of the M365 account.|
|M365_TENANT_ID|To identify the tenant in which the Teams App will be created/published. This value is optional unless you have a multi-tenant account and you want to use another tenant. Read more on [how to find your M365 tenant ID](https://docs.microsoft.com/en-us/azure/active-directory/fundamentals/active-directory-how-to-find-tenant).|
> Note: Please refer to the [Configure M365/Azure Credentials](https://github.com/OfficeDev/teamsfx-cli-action/blob/main/README.md#configure-m365azure-credentials-as-github-secret) to make sure you have disabled Multi-factor Authentication and Security Defaults for the credentials used in the workflow.

## CI/CD Pipeline Templates in Jenkins

To add these templates to your repository, you will need your versions of [jenkins-ci-template.Jenkinsfile](https://github.com/OfficeDev/TeamsFx/blob/main/docs/cicd/jenkins-ci-template.Jenkinsfile) and  [jenkins-cd-template.Jenkinsfile](https://github.com/OfficeDev/TeamsFx/blob/main/docs/cicd/jenkins-cd-template.Jenkinsfile) to be located in your repository by branch.

Also, you need to create CI/CD pipelines in Jenkins which point to the specific `Jenkinsfile` correspondingly.

To check how to connect Jenkins with different SCM platforms:
1. [Jenkins with GitHub](https://www.jenkins.io/solutions/github/)
2. [Jenkins with Azure DevOps](https://www.dragonspears.com/blog/ci-cd-with-jenkins-and-azure-devops-services)
3. [Jenkins with GitLab](https://docs.gitlab.com/ee/integration/jenkins.html)
4. [Jenkins with Bitbucket](https://medium.com/ampersand-academy/integrate-bitbucket-jenkins-c6e51103d0fe)

### Customize CI Pipeline
There are some potential changes you can make to adapt your project:

1. Rename the template file to `Jenkinsfile` since it's a common practice, and put it under the target branch, for example, the `dev` branch.
1. Change how the CI flow is triggered. We default to use the triggers of `pollSCM` when a new change is pushed into the `dev` branch.
1. Ensure you have a npm build script, or customize the way you build in the automation code.
1. Ensure you have a npm test script which returns zero for success, and/or change the test commands.

### Customize CD Pipeline
You may want to change:
1. Rename the template file to `Jenkinsfile` since it's a common practise, and put it under the target branch, for example, the `main` branch.
1. How the CD flow is triggered. We default to use the triggers of `pollSCM` when a new change is pushed into the `main` branch.
1. Create Jenkins [pipeline credentials](https://www.jenkins.io/doc/book/using/using-credentials/) to hold Azure/M365 login credentials. The table below lists all the credentials you need to create on Jenkins.
1. Change the build scripts if necessary.
1. Remove the test scripts if you don't have tests.

> Note: The provision step is not included in the CD template as it's usually executed only once. You can either execute provision Within Teams Toolkit, TeamsFx CLI, or using a seperated workflow. Please remember to commit after provisioning (results of provisioning will be deposited inside the `.fx` folder) and save the file content of `default.userdata` into Jenkins credentials to generate file `default.userdata`.

### Environment Variables
Please follow [using-credentials](https://www.jenkins.io/doc/book/using/using-credentials/) to create credentials on Jenkins.

|Name|Description|
|---|---|
|AZURE_ACCOUNT_NAME|The account name of Azure which is used to provision resources.|
|AZURE_ACCOUNT_PASSWORD|The password of Azure account.|
|AZURE_SUBSCRIPTION_ID|To identify the subscription in which the resources will be provisioned.|
|AZURE_TENANT_ID|To identify the tenant in which the subscription resides.|
|M365_ACCOUNT_NAME|The M365 account for creating and publishing the Teams App.|
|M365_ACCOUNT_PASSWORD|The password of the M365 account.|
|M365_TENANT_ID|To identify the tenant in which the Teams App will be created/published. This value is optional unless you have a multi-tenant account and you want to use another tenant. Read more on [how to find your M365 tenant ID](https://docs.microsoft.com/en-us/azure/active-directory/fundamentals/active-directory-how-to-find-tenant).|
> Note: Please refer to the [Configure M365/Azure Credentials](https://github.com/OfficeDev/teamsfx-cli-action/blob/main/README.md#configure-m365azure-credentials-as-github-secret) to make sure you have disabled Multi-factor Authentication and Security Defaults for the credentials used in the pipeline.

## Setup CI/CD Pipelines with other platforms
You can follow the pre-defined example bash scripts to build and customize CI/CD pipelines on other platforms:
* [CI Scripts](https://github.com/OfficeDev/TeamsFx/blob/main/docs/cicd/others-script-ci-template.sh)
* [CD Scripts](https://github.com/OfficeDev/TeamsFx/blob/main/docs/cicd/others-script-cd-template.sh)
The scripts are pretty straightforward and most parts of them are cross-platform CLI, so it's easy to transform them to other types of script, for example, powershell.

The scripts are based on a cross-platform TeamsFx command line tool [TeamsFx-CLI](https://www.npmjs.com/package/@microsoft/teamsapp-cli). You can install it with `npm install -g @microsoft/teamsapp-cli` and follow the [documentation](https://github.com/OfficeDev/TeamsFx/blob/dev/docs/cli/user-manual.md) to customize the scripts.

> Note: To enable `@microsoft/teamsapp-cli` running in CI mode, turn on `CI_ENABLED` by `export CI_ENABLED=true`. In CI mode, `@microsoft/teamsapp-cli` is friendly for CI/CD.

Please keep in mind that you need to set Azure and M365 credentials in your environment variables safely. For example if you are using Github as your source code repository, you can use the [Github Secrets](https://docs.github.com/en/actions/reference/encrypted-secrets) to securely store your environment variables.

# Additional Notes
* [Quick Start for GitHub Actions](https://docs.github.com/en/actions/quickstart#creating-your-first-workflow)
* [Create your first Azure DevOps Pipeline](https://docs.microsoft.com/en-us/azure/devops/pipelines/create-first-pipeline?view=azure-devops&tabs=java%2Ctfs-2018-2%2Cbrowser)
* [Create your first Jenkins Pipeline](https://www.jenkins.io/doc/pipeline/tour/hello-world/)
