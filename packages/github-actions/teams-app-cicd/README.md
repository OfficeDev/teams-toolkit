# Teams Toolkit CI/CD GitHub Action

This action helps Teams App Developers to build their CI/CD workflows.

## Inputs

## `project-root`

**Optional** The root of Teams App Project. Default `${GITHUB_WORKSPACE}`.

## `operation-type`

**Required** The operation type which includes `Build Teams App`, `Provision Hosting Environment`, `Deploy to Hosting Environment`, `Pack Teams App`, `Validate Teams App Manifest`, `Publish Teams App`. Default `Build Teams App`.

## `capabilities`

**Optional** The capabilities selected for operation-type `Build Teams App`. By default, all capabilities are selected.
Possible values are `tabs`, `bot` and `SPFx`.

## Environment Variables
The following environment variables can be separated into two groups. One is for Azure, the other is for M365.
Both Azure and M365 use `username/password` style to provide login credentials in environment variables.

To make these accounts work in CI/CD workflows, extra configurations should be made. Two-step authentication and security defaults should be turned off. Go to Azure AD -> Users -> MFA and Azure AD -> Properties -> Manage Security defaults to turn them off. Also, please make sure the M365 account has sufficient privileges to provision AAD Applications.

## `AZURE_ACCOUNT_NAME`

**Required** The azure account name for provision.

## `AZURE_ACCOUNT_PASSWORD`

**Required** The azure account password for provision.

## `AZURE_SUBSCRIPTION_ID`

**Required** The azure subscription id which identifies the subscription for provision.

## `AZURE_TENANT_ID`

**Required** The azure tenant id.

## `M365_ACCOUNT_NAME`

**Required** The M365 account name for creating/publishing Teams App.

## `M365_ACCOUNT_PASSWORD`

**Required** The M365 account password.

## `M365_TENANT_ID`

**Required** The M365 tenant id. 

## Outputs

## `config-file-path`

The path of file env.default.json.

## `sharepoint-package-path`

The path of generated SharePoint package file.

## `package-zip-path`

The path of packed Teams App Package file.

## Example usage

Search [GitHub Action Marketplace](https://github.com/marketplace?type=actions) by keyword `teams-app-cicd`, you will find the GitHub Action. During editing workflows on GitHub web page, follow the [guide](https://docs.github.com/en/actions/learn-github-actions/finding-and-customizing-actions) to search and add the GitHub Action for your own use.

```
uses: OfficeDev/TeamsFx/packages/github-actions/teams-toolkit-cicd@ruhe/action_toolkit_cicd
with:
  operation-type: 'Provision Hosting Environment'
```