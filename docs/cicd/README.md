# CI/CD Support for Teams Application Developers

If you're developing teams applications inside a company and considering to build your workflows/pipelines, you've come to the right place. This document is to describe what are provided to help you to build workflows/pipelines, and also guide you to get started quickly.


## What are provided?
1. First-party published GitHub Action: [teamsfx-cli-action](https://github.com/OfficeDev/teamsfx-cli-action).

1. Predefined example workflows: [github-ci-template.yml](https://github.com/OfficeDev/TeamsFx/blob/ruhe/cicd_ymls/docs/cicd/github-ci-template.yml), [github-cd-template.yml](https://github.com/OfficeDev/TeamsFx/blob/ruhe/cicd_ymls/docs/cicd/github-cd-template.yml).

1. Predefined example scripts: [others-script-ci-template.sh](https://github.com/OfficeDev/TeamsFx/blob/ruhe/cicd_ymls/docs/cicd/others-script-ci-template.sh), [others-script-cd-template.sh](https://github.com/OfficeDev/TeamsFx/blob/ruhe/cicd_ymls/docs/cicd/others-script-cd-template.sh).

## Getting started guide for GitHub

### Continuous Integration
If you want to create a GitHub workflow for continuous integration, this is simple. Just copy the predefined example workflow [github-ci-template.yml](https://github.com/OfficeDev/TeamsFx/blob/ruhe/cicd_ymls/docs/cicd/github-ci-template.yml) into your repository under the folder `.github/workflows` which follows GitHub's practise, and do modifications to meet your own needs.

The expected modifications include but not limited to:
1. Change the build scripts to suit your project.
1. Set up the unit test framework for your project and run test by `npm run test`.

### Continuous Deployment
If you want to create a GitHub workflow for continuous deployment, you need to copy the predefined example workflow [github-cd-template.yml](https://github.com/OfficeDev/TeamsFx/blob/ruhe/cicd_ymls/docs/cicd/github-cd-template.yml) into your repository under the folder `.github/workflows` which follows GitHub's practise, and do modifications to meet your own needs.

The expected modifications include but not limited to:
1. Modify the trigger pattern to suit your own requirements.
In the example workflow's definition, the workflow will be triggered when there's new commits pushed into the main branch. We don't force you to use this pattern, and you can change it by your case.

1. Create GitHub repository secrets by environment to hold Azure/M365 login credentials.
The table below lists all the secrets you needs to create on GitHub, and for the detailed usage, please refer to the GitHub Action's [README.md](https://github.com/OfficeDev/teamsfx-cli-action/blob/main/README.md).

|Name|Description|
|---|---|
|AZURE_ACCOUNT_NAME|The account name of Azure which is used to provision resources.|
|AZURE_ACCOUNT_PASSWORD|The password of Azure account.|
|AZURE_SUBSCRIPTION_ID|To identify the subscription in which the resources will be provisined.|
|AZURE_TENANT_ID|To identify the tenant in which the subscription resides.|
|M365_ACCOUNT_NAME|The M365 account for creating and publishing Teams App.|
|M365_ACCOUNT_PASSWORD|The password of M365 account.|
|M365_TENANT_ID|To identify the tenant in which the Teams App will be created/published. PS: if not provided, the default tenant id will be used.|

1. Update the environment variable `RUN_PROVISION` inside the workflow definition accordingly.
Usually, the provision step will be performed for only once and subsequent runs of the workflow dosn't need to run provision again. So, there's environment variable `RUN_PROVISION` to control this. One thing needs to mentioned is, after provision, the configs will be commited into the repository, and the following deploy, publish operations will target for this committed configs.
To be more specific, to run provision, set `RUN_PROVISION` to `true`, else set it to `false`.

## Getting started guide for other platforms
Predefined example scripts are provided to help you to build workflows/pipelines on other platforms, for example Jenkins, and the scripts are pretty straight forward. Although they are written in bash style, but you can easily convert them to any other platforms since [teamsfx-cli](https://www.npmjs.com/package/@microsoft/teamsfx-cli) itself is cross-platform and the scripts largely leverages it.

One thing needs to be mentioned is, you needs to set Azure/M365 credentials in your environment variables safely.