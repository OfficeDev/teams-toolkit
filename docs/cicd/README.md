# CI/CD Support for Teams Application Developers

TeamsFx helps automate your development workflow when buidling a Teams applictaion. These documents provides some templates for you to quickly get started with CI/CD.

|Tools and Templates|Description|
|---|---|
|[teamsfx-cli-action](https://github.com/OfficeDev/teamsfx-cli-action)|A ready-to-use GitHub Action.|
|[github-ci-template.yml](https://github.com/OfficeDev/TeamsFx/blob/main/docs/cicd/github-ci-template.yml) and [github-cd-template.yml](https://github.com/OfficeDev/TeamsFx/blob/main/docs/cicd/github-cd-template.yml)| GitHub CI templates for a Teams app. |
|[script-ci-template.sh](https://github.com/OfficeDev/TeamsFx/blob/main/docs/cicd/others-script-ci-template.sh) and [script-cd-template.sh](https://github.com/OfficeDev/TeamsFx/blob/main/docs/cicd/others-script-cd-template.sh)| Script templates for automation everywhere else outside of GitHub. |

## CI/CD Workflow Teamplates in GitHub

To add this to your repository, you will need your versions of [github-ci-template.yml](https://github.com/OfficeDev/TeamsFx/blob/main/docs/cicd/github-ci-template.yml) and  [github-cd-template.yml](https://github.com/OfficeDev/TeamsFx/blob/main/docs/cicd/github-cd-template.yml) to be located in your repository under the folder `.github/workflows`. 

### Customize CI Workflow
There are some potential changes you can make to adapt your project:
1. Change how the CI flow is triggerd. We default it to when pull request is created targeting dev branch.
1. Change the build scripts.
1. Remove the test scripts if you don't want to set up the unit test framework for your project.

### Customize CD Workflow
1. Change how the CD flow is triggered. We default it to when new commits made to main branch.
1. Create GitHub repository secrets by environment to hold Azure/M365 login credentials. The table below lists all the secrets you need to create on GitHub, and for the detailed usage, please refer to the GitHub Action's [README.md](https://github.com/OfficeDev/teamsfx-cli-action/blob/main/README.md).
1. Change the build scripts.
1. Remove the test scripts if you don't want to set up the unit test framework for your project.
1. The provision step is expected to run separately by hand or by workflow, and remember to commit provision configs into the code and save required secrets into GitHub secrets to generate file `default.userdata` as you can infer from the yml file.

### Environment Variables

|Name|Description|
|---|---|
|AZURE_ACCOUNT_NAME|The account name of Azure which is used to provision resources.|
|AZURE_ACCOUNT_PASSWORD|The password of Azure account.|
|AZURE_SUBSCRIPTION_ID|To identify the subscription in which the resources will be provisined.|
|AZURE_TENANT_ID|To identify the tenant in which the subscription resides.|
|M365_ACCOUNT_NAME|The M365 account for creating and publishing Teams App.|
|M365_ACCOUNT_PASSWORD|The password of M365 account.|
|M365_TENANT_ID|To identify the tenant in which the Teams App will be created/published. PS: if not provided, the default tenant id will be used.|


## Getting started guide for other platforms
You can follow the pre-defined example scripts to build and customize CI/CD pipelines on other platforms like Jenkins:
* [CI Scripts](https://github.com/OfficeDev/TeamsFx/blob/main/docs/cicd/others-script-ci-template.sh)
* [CD Scripts](https://github.com/OfficeDev/TeamsFx/blob/main/docs/cicd/others-script-cd-template.sh)

The scripts are based on a cross-platform TeamsFx command line tool [TeamsFx-CLI](https://www.npmjs.com/package/@microsoft/teamsfx-cli). You can install it with `npm install -g @microsoft/teamsfx-cli` and follow the [documentation](https://github.com/OfficeDev/TeamsFx/blob/dev/docs/cli/user-manual.md) to customize the scripts.

Please keep in mind that you need to set Azure and M365 credentials in your environment variables safely.

# Additional Notes
* [Quick Start for GitHub Actions](https://docs.github.com/en/actions/quickstart#creating-your-first-workflow)
