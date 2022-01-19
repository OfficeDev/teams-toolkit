## How to scaffold from pre-release templates?

Teams Toolkit downloads latest stable templates by default from [GitHub releases](https://github.com/OfficeDev/TeamsFx/releases) for scaffolding.

To scaffold your project from rc templates, set the environment varaible `TEAMSFX_TEMPLATE_PRERELEASE=rc`. Then Teams Toolkit download templates from [rc release](https://github.com/OfficeDev/TeamsFx/releases/tag/templates%400.0.0-rc)

To scaffold from alpha release templates, set `TEAMSFX_TEMPLATE_PRERELEASE=alpha`. Then Teams Toolkit download templates from [rc release](https://github.com/OfficeDev/TeamsFx/releases/tag/templates%400.0.0-alpha)

## How to debug templates?

1. Set `DEBUG_TEMPLATE=true` to your environment variables.
1. Add your changes in templates source code.
1. cd to vscode-extension folder.
1. F5 to local debug and create new project.
1. The `FetchTemplateZipFromSourceCode` action will get template from the source code that you just changed.

* `FetchTemplatesUrlWithTag`, `FetchTemplatesZipFromUrl`, `FetchTemplateZipFromLocal`, these actions are skipped.
* Since bot's and messaging extension's templates are generated during CD pipeline, we can't debug those code with `FetchTemplateZipFromSourceCode` action.
