# CI/CD Support for Teams Application Developers

TeamsFx helps automate your development workflow when building a Teams application. These documents provide some templates for you to quickly get started with CI/CD.

Note> Ensure that you follow the instructions from [Enable-Preview-Features-in-Teams-Toolkit](https://github.com/OfficeDev/TeamsFx/wiki/Enable-Preview-Features-in-Teams-Toolkit) to enable preview features.

|Tools and Templates|Description|
|---|---|
|[teamsfx-cli-action](https://github.com/OfficeDev/teamsfx-cli-action)|A ready-to-use GitHub Action.|
|[github-ci-template.yml](https://github.com/OfficeDev/TeamsFx/blob/main/docs/cicd_insider/github-ci-template.yml) and [github-cd-template.yml](https://github.com/OfficeDev/TeamsFx/blob/main/docs/cicd_insider/github-cd-template.yml)| GitHub CI/CD templates for a Teams app. |
|[jenkins-ci-template.Jenkinsfile](https://github.com/OfficeDev/TeamsFx/blob/main/docs/cicd_insider/jenkins-ci-template.Jenkinsfile) and [jenkins-cd-template.Jenkinsfile](https://github.com/OfficeDev/TeamsFx/blob/main/docs/cicd_insider/jenkins-cd-template.Jenkinsfile)|Jenkins CI/CD templates for a Teams app.|
|[script-ci-template.sh](https://github.com/OfficeDev/TeamsFx/blob/main/docs/cicd_insider/others-script-ci-template.sh) and [script-cd-template.sh](https://github.com/OfficeDev/TeamsFx/blob/main/docs/cicd_insider/others-script-cd-template.sh)| Script templates for automation everywhere else outside of GitHub. |

## CI/CD Workflow Templates in GitHub

To add these templates to your repository, you will need your versions of [github-ci-template.yml](https://github.com/OfficeDev/TeamsFx/blob/main/docs/cicd_insider/github-ci-template.yml) and  [github-cd-template.yml](https://github.com/OfficeDev/TeamsFx/blob/main/docs/cicd_insider/github-cd-template.yml) to be located in your repository under the folder `.github/workflows`. 

### Customize CI Workflow
There are some potential changes you can make to adapt your project:

1. Change how the CI flow is triggered. We default to when a pull request is created targeting the `dev` branch.
1. Ensure you have an npm build script, or customize the way you build in the automation code.
1. Ensure you have an npm test script which returns zero for success, and/or change the test commands.

### Customize CD Workflow
You may want to change:
1. How the CD flow is triggered. By default it happens when new commits are made to the `main` branch.
1. Create GitHub [repository secrets](https://docs.github.com/en/actions/reference/encrypted-secrets) by environment to hold Azure/M365 login credentials. The table below lists all the secrets you need to create on GitHub, and for detailed usage, please refer to the GitHub Actions [README.md](https://github.com/OfficeDev/teamsfx-cli-action/blob/main/README.md).
1. Change the build scripts if necessary.
1. Remove the test scripts if you don't have tests.

> Note: The provision step is expected to run separately by hand or by workflow. Please remember to commit after provisioning (results of provisioning will be deposited inside the `.fx` folder) and save the file content of `.fx/publishProfiles/{YOUR_ENV_NAME}.userdata` into GitHub [repository secrets](https://docs.github.com/en/actions/reference/encrypted-secrets) for future usage.

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

## CI/CD Pipeline Templates in Jenkins

To add these templates to your repository, you will need your versions of [jenkins-ci-template.Jenkinsfile](https://github.com/OfficeDev/TeamsFx/blob/main/docs/cicd_insider/jenkins-ci-template.Jenkinsfile) and  [jenkins-cd-template.Jenkinsfile](https://github.com/OfficeDev/TeamsFx/blob/main/docs/cicd_insider/jenkins-cd-template.Jenkinsfile) to be located in your repository by branch.

Also, you need to create CI/CD pipelines in Jenkins which point to the specific `Jenkinsfile` correspondingly.

To check how to connect Jenkins with different SCM platforms:
1. [Jenkins with GitHub](https://www.jenkins.io/solutions/github/)
2. [Jenkins with Azure DevOps](https://www.dragonspears.com/blog/ci-cd-with-jenkins-and-azure-devops-services)
3. [Jenkins with GitLab](https://docs.gitlab.com/ee/integration/jenkins.html)
4. [Jenkins with Bitbucket](https://medium.com/ampersand-academy/integrate-bitbucket-jenkins-c6e51103d0fe)

### Customize CI Pipeline
There are some potential changes you can make to adapt your project:

1. Rename the template file to `Jenkinsfile` since it's a common practise, and put it under the target branch, for example, the `dev` branch.
1. Change how the CI flow is triggered. We default to use the triggers of `pollSCM` when a new change is pushed into the `dev` branch.
1. Ensure you have an npm build script, or customize the way you build in the automation code.
1. Ensure you have an npm test script which returns zero for success, and/or change the test commands.

### Customize CD Pipeline
You may want to change:
1. Rename the template file to `Jenkinsfile` since it's a common practise, and put it under the target branch, for example, the `main` branch.
1. How the CD flow is triggered. We default to use the triggers of `pollSCM` when a new change is pushed into the `main` branch.
1. Create Jenkins [pipeline credentials](https://www.jenkins.io/doc/book/using/using-credentials/) to hold Azure/M365 login credentials. The table below lists all the credentials you need to create on Jenkins.
1. Change the build scripts if necessary.
1. Remove the test scripts if you don't have tests.

> Note: The provision step is expected to run separately by hand or by pipeline. Please remember to commit after provisioning (results of provisioning will be deposited inside the `.fx` folder) and save the file content of `.fx/publishProfiles/{YOUR_ENV_NAME}.userdata` into Jenkins credentials for future usage.

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

## Getting started guide for other platforms
You can follow the pre-defined example scripts to build and customize CI/CD pipelines on other platforms like Jenkins:
* [CI Scripts](https://github.com/OfficeDev/TeamsFx/blob/main/docs/cicd_insider/others-script-ci-template.sh)
* [CD Scripts](https://github.com/OfficeDev/TeamsFx/blob/main/docs/cicd_insider/others-script-cd-template.sh)

The scripts are based on a cross-platform TeamsFx command line tool [TeamsFx-CLI](https://www.npmjs.com/package/@microsoft/teamsfx-cli). You can install it with `npm install -g @microsoft/teamsfx-cli` and follow the [documentation](https://github.com/OfficeDev/TeamsFx/blob/dev/docs/cli/user-manual.md) to customize the scripts.

> Note: To enable `@microsoft/teamsfx-cli` running in CI mode, turn on `CI_ENABLED` by `export CI_ENABLED=true`. In CI mode, `@microsoft/teamsfx-cli` is friendly for CI/CD.

Please keep in mind that you need to set Azure and M365 credentials in your environment variables safely. For example if you are using Github as your source code repository, you can use the [Github Secrets](https://docs.github.com/en/actions/reference/encrypted-secrets) to securely store your environment variables.

# Additional Notes
* [Quick Start for GitHub Actions](https://docs.github.com/en/actions/quickstart#creating-your-first-workflow)
