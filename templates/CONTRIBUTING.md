## How to scaffold from pre-release templates?

Teams Toolkit downloads latest stable templates by default from [GitHub releases](https://github.com/OfficeDev/TeamsFx/releases) for scaffolding.

To scaffold your project from rc templates, set the environment varaible `TEAMSFX_TEMPLATE_PRERELEASE=rc`. Then Teams Toolkit download templates from [rc release](https://github.com/OfficeDev/TeamsFx/releases/tag/templates%400.0.0-rc)

We do not release alpha template since alpha fx-core use local template to avoid incompatibility. `TEAMSFX_TEMPLATE_PRERELEASE=alpha`does nothing.
To test latest template in dev branch, please refer to [How to debug templates](#how-to-debug-templates).

## How to release a new template?

1. If your template relies on @microsoft/teamsfx, @microsoft/teamsfx-react or @microsoft/adaptivecards-tools, please include the relative path to your new template in the [package.json](https://github.com/OfficeDev/TeamsFx/blob/dev/templates/package.json) file. Here is an example of how to add the path:
  ```
  "templates": [
    "js/command-and-response",
    "ts/command-and-response",
    "language/your-new-template"
  ]
  ```
1. The CD pipeline will automatically update the dependencies in the package.json or package.json.tpl file when a new version of @microsoft/teamsfx, @microsoft/teamsfx-react or @microsoft/adaptivecards-tools is released. You can access the script used for this process [here](https://github.com/OfficeDev/TeamsFx/blob/dev/.github/scripts/sync-version.js).
1. TeamsFx no longer uses Lerna for template versioning. Adding a `BREAKING CHANGE` footer will no longer have any effect. The release manager must manually bump up the major version of the template when a breaking change occurs.

Some breaking change cases:

* Involve new placeholder in templates.
* Upgrade template's dependencies which deprecates support to lower version NodeJs. Latest Teams Toolkit notices users to upgrade their environment but older version Teams Toolkit does not.
* Remove or rename templates.

Cases that are not breaking changes:

* Add new templates that old Teams Toolkit does not have entry to get and scaffold them.
* Add new features to templates that does not require any change in Teams Toolkit.
* Totally rewrite a template but old Teams Toolkit can still work with it.

## How to debug templates?

1. Set `TEAMSFX_DEBUG_TEMPLATE=true` to your environment variables.
2. If you would like to debug csharp scaffolding template through VS Teams Toolkit Extension, please also set `NODE_ENV="development"` to your environment variables.
3. Add your changes in templates source code.
4. cd to vscode-extension folder.
5. F5 to local debug and create new project.
6. The `FetchTemplateZipFromSourceCode` action will get template from the source code that you just changed.

* `FetchTemplatesUrlWithTag`, `FetchTemplatesZipFromUrl`, `FetchTemplateZipFromLocal`, these actions are skipped.

## What is template constraints?

In order to streamline the maintenance process and reduce the risk of errors, it is necessary to address the issue of duplicate content in our templates.
To address this issue, we are implementing a system of constraints that will standardize the way templates are updated and protect them from unexpected changes.

Currently, these constraints have been applied to the following files within the template:

  * teamsapp.yml (teamsapp.yml.tpl)
  * teamsapp.local.yml (teamsapp.local.yml.tpl)

The [constraints for yml](https://github.com/OfficeDev/TeamsFx/tree/dev/templates/constraints/yml/templates) are in [mustache](https://mustache.github.io/mustache.5.html) format and follow a folder naming convention where one mustache file corresponds to a yml file.

For example, `js/dashboard-tab/teamsapp.yml.tpl` corresponds to `js/dashboard-tab/teamsapp.yml.tpl.mustache`.

Each teamsapp.yml file consists of a header and several actions. To simplify the process, we have abstracted each action into a partial mustache template that can be invoked by the yml constraints.

### How to work with constraints?

The constraint engine provides four distinct commands:

```
> npm run verify <constraint-path>
```

The verify command verifies whether the constraint is satisfied.
When no constraint path is provided, this command will scan through all constraint files and verify that each one is being satisfied.

```
> npm run apply <constraint-path>
```

The apply command applies the constraint to corresponding template.
When no constraint path is provided, this command will scan through all constraint files and apply them to the templates.
This command will overwrite the template file, so ensure that there are no untracked changes in target templates before running this command.

```
> npm run init <template-path>
```

The init command scans the template folder and identifies all supported files to initialize constraints for them.
Usually, you will need to review the generated constraints and make any necessary adjustments to ensure their correctness.

```
> npm run watch
```

The watch command watches all mustache template in the [constraints/yml/actions](./constraints/yml/actions). Whenever a file change event occurs, it generates a preview of the mustache template in the same folder, which is particularly useful when writing a mustache template.
![preview mustache demo](https://user-images.githubusercontent.com/26134943/255495650-a5bcd0f9-5342-4901-a53b-a41dda5f32ef.gif)

### How to update templates with constraints?

Let us take Teams App project file (teamsapp.yml) as an example.

To update the Teams App project file for a specific template as a template owner, follow these steps:

1. Locate the corresponding YAML constraints for your template at [constraints/yml/templates](./constraints/yml/templates).
1. Make the necessary changes in the constraint, such as adding or updating an action, metadata, or upgrading the schema version.
1. Apply the constraint changes to your template by running `apply` command:
    ```
    > npm run apply
    ```
1. Commit both the constraint and Teams App project file, and create a pull request to submit the changes. The CI action will ensure that all template constraints are satisfied.

To update all Teams App project files that reference your action as an action owner, follow these steps:

1. Find your action snippets at [constraints/yml/actions](./constraints/yml/actions/)
1. Make the necessary changes in the action snippet, such as adding new parameters, updating comments, creating a placeholder, or adding a new built-in action.
1. (Optional) Preview the action snippets by running the `watch` command:
    ```
    > npm run watch
    ```
1. (Optional) If you are updating the interface of the action snippet, update existing YAML constraints to avoid breaking them.
1. Apply the action snippet changes to all templates by running the `apply` command:
    ```
    > npm run apply
    ```
1. Commit both the action snippet and Teams App project files, and create a pull request to submit the changes. Ask for template owners review since you are updating the Teams App project file for their templates.

### How to create constraints for a new template?

It is recommended to apply constraints to all templates to ensure consistency, minimize errors and optimize maintenance.

As a template owner, you can draft the template constraints first and use the `apply` command to generate the corresponding solution when adding a new template.
Alternatively, you can prepare the template to ensure that it works from end to end and follow the steps to create constraints:

1. Use the `init` command to initialize the corresponding constraints based on the solution:

    ```
    > npm run init <path-to-the-template-folder>
    ```

1. Adjust the generated constraints to ensure their correctness and verify the constraints are satisfied by running the `verify` command:

    ```
    > npm run verify
    ```
