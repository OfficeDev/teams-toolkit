# How to use pre-cooked pipelines on Azure DevOps

## Prerequisites
- Teams app projects are version controlled by Azure DevOps.
- (Optional) An Microsoft 365 account. If you do not have Microsoft 365 account, apply one from [Microsoft 365 developer program](https://developer.microsoft.com/en-us/microsoft-365/dev-program). The Microsoft 365 account credentials are required for steps of provision, publish and deployment for SPFx projects. Any extra interactive verification steps should be disabled for the Microsoft 365 account, and please check details in sections below.
- (Optional) An Azure service principal with necessary permissions. The Azure service principal credentials are required for steps of provision and deploy for Azure based projects.

## Steps
After the pre-cooked pipelines are scaffolded successfully, the following steps are expected to be performed:
1. Commit and push your project source code to Azure DevOps remote repository, including the CI/CD yml files.
1. Create corresponding Azure DevOps pipelines by following [Create your first Azure DevOps Pipeline](https://docs.microsoft.com/en-us/azure/devops/pipelines/create-first-pipeline?view=azure-devops&tabs=java%2Ctfs-2018-2%2Cbrowser).
1. Configure necessary Azure DevOps Pipeline variables if your pipelines require credentials by checking into the yml files.
1. Trigger your pipelines automatically, manually or do customization (Check the `trigger:` or `pr:` section in yml files to find the triggers). More about triggers in Azure DevOps, refer to [Triggers in Azure pipelines](https://docs.microsoft.com/en-us/azure/devops/pipelines/build/triggers?view=azure-devops).

## Azure DevOps Pipeline Variables 
Steps to create Pipeline variables in Azure DevOps:
1. In the Pipeline editing page, click `Variables` on top right and click `New variable`.
1. Enter Name/Value pair for your variable.
1. Toggle the checkbox of `Keep this value secret` if necessary.
1. Click `OK` to create the variable. 

|Name|Description|
|---|---|
|AZURE_SERVICE_PRINCIPAL_NAME|The service principal name of Azure used to provision resources.|
|AZURE_SERVICE_PRINCIPAL_PASSWORD|The password of Azure service principal.|
|AZURE_SUBSCRIPTION_ID|To identify the subscription in which the resources will be provisioned.|
|AZURE_TENANT_ID|To identify the tenant in which the subscription resides.|
|M365_ACCOUNT_NAME|The Microsoft 365 account for creating and publishing the Teams App.|
|M365_ACCOUNT_PASSWORD|The password of the Microsoft 365 account.|
|M365_TENANT_ID|To identify the tenant in which the Teams App will be created/published. This value is optional unless you have a multi-tenant account and you want to use another tenant. Read more on [how to find your Microsoft 365 tenant ID](https://docs.microsoft.com/en-us/azure/active-directory/fundamentals/active-directory-how-to-find-tenant).|
> Note: Currently, a non-interactive authentication style for Microsoft 365 is used in CI/CD workflows, so please ensure that your Microsoft 365 account has sufficient privileges in your tenant and doesn't have multi-factor authentication or other advanced security features enabled. Please refer to the [Configure Microsoft 365 Credentials](https://github.com/OfficeDev/teamsfx-cli-action/blob/main/README.md#configure-m365azure-credentials-as-github-secret) to make sure you have disabled Multi-factor Authentication and Security Defaults for the credentials used in the workflow.

> Note: Currently, service principal for Azure is used in CI/CD workflows, and to create Azure service principals for use, refer to [here](#how-to-create-azure-service-principals-for-use).

# How to create Azure service principals for use?
To provision and deploy resources targeting Azure inside CI/CD, you must create an Azure service principal for use.

Briefly, the steps include:
1. Register an Azure AD application in single tenant, and it requires sufficient permissions in your Azure AD tenant.
2. Assign a role to your Azure AD application to access your Azure subscription, and `Contributor` role is recommended. 
3. Create a new Azure AD application secret.
4. Grab your tenant id, application id(AZURE_SERVICE_PRINCIPAL_NAME), and the secret(AZURE_SERVICE_PRINCIPAL_PASSWORD) for use.

For detailed guidelines, refer to [the official document](https://docs.microsoft.com/en-us/azure/active-directory/develop/howto-create-service-principal-portal). There're three ways to create service principal, [Azure portal](https://docs.microsoft.com/en-us/azure/active-directory/develop/howto-create-service-principal-portal), [PowerShell](https://docs.microsoft.com/en-us/azure/active-directory/develop/howto-authenticate-service-principal-powershell), [Azure CLI](https://docs.microsoft.com/en-us/cli/azure/create-an-azure-service-principal-azure-cli), and you can choose the way you like.

# Additional Notes
* [Create your first Azure DevOps Pipeline](https://docs.microsoft.com/en-us/azure/devops/pipelines/create-first-pipeline?view=azure-devops&tabs=java%2Ctfs-2018-2%2Cbrowser)
* [Manage your apps with the Developer Portal for Microsoft Teams](https://docs.microsoft.com/en-us/microsoftteams/platform/concepts/build-and-test/teams-developer-portal)
