# Teams Toolkit CI/CD GitHub Action

This action helps Teams App Developers to build their CI/CD workflows.

## Inputs

## `project-root`

**Optional** The root of Teams App Project. Default `${GITHUB_WORKSPACE}`.

## `operation-type`

**Required** The operation type which includes `Build Teams App`, `Provision Hosting Environment`, `Deploy to Hosting Environment`, `Pack Teams App`, `Validate Teams App Manifest`, `Publish Teams App`. Default `Build Teams App`.

## `capabilities`

**Optional** The capabilities selected for operation-type `Build Teams App`. By default, all capabilities are selected.

## Outputs

## `config-file-path`

The path of file env.default.json.

## `sharepoint-package-path`

The path of generated SharePoint package file.

## `package-zip-path`

The path of packed Teams App Package file.

## Example usage

```
uses: OfficeDev/TeamsFx/packages/github-actions/teams-toolkit-cicd@ruhe/action_toolkit_cicd
with:
  operation-type: 'Provision Hosting Environment'
```