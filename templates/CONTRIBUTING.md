## How to scaffold from pre-release templates?

Teams Toolkit downloads latest stable templates by default from [GitHub releases](https://github.com/OfficeDev/TeamsFx/releases) for scaffolding.

To scaffold your project from rc templates, set the environment varaible `TEAMSFX_TEMPLATE_PRERELEASE=rc`. Then Teams Toolkit download templates from [rc release](https://github.com/OfficeDev/TeamsFx/releases/tag/templates%400.0.0-rc)

We do not release alpha template since alpha fx-core use local template to avoid incompatibility. `TEAMSFX_TEMPLATE_PRERELEASE=alpha`does nothing.
To test latest template in dev branch, please refer to [How to debug templates](#how-to-debug-templates).

## How to release a new template?

1. If your template relies on TeamsFx SDK or TeamsFx React SDK, please include the relative path to your new template in the [package.json](https://github.com/OfficeDev/TeamsFx/blob/dev/templates/package.json) file. Here is an example of how to add the path:
  ```
  "templates": [
    "js/command-and-response",
    "ts/command-and-response",
    "language/your-new-template"
  ]
  ```
1. The CD pipeline will automatically update the dependencies in the package.json or package.json.tpl file when a new version of TeamsFx SDK or TeamsFx React SDK is released. You can access the script used for this process [here](https://github.com/OfficeDev/TeamsFx/blob/dev/.github/scripts/sync-version.js).
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
