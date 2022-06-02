## How to scaffold from pre-release templates?

Teams Toolkit downloads latest stable templates by default from [GitHub releases](https://github.com/OfficeDev/TeamsFx/releases) for scaffolding.

To scaffold your project from rc templates, set the environment varaible `TEAMSFX_TEMPLATE_PRERELEASE=rc`. Then Teams Toolkit download templates from [rc release](https://github.com/OfficeDev/TeamsFx/releases/tag/templates%400.0.0-rc)

To scaffold from alpha release templates, set `TEAMSFX_TEMPLATE_PRERELEASE=alpha`. Then Teams Toolkit download templates from [rc release](https://github.com/OfficeDev/TeamsFx/releases/tag/templates%400.0.0-alpha)

## How to release a new template?

1. Add the relative path to your new template in [package.json](https://github.com/OfficeDev/TeamsFx/blob/dev/templates/package.json)
  ```
  "templates": [
        "blazor-base/csharp/default",
        "bot/csharp/default",
        "bot/js/default",
        "bot/ts/default",
        "your/new/template"
  ]
  ```
2. In cd pipeline, all templates in the list will be zipped and be released to GitHub.

3. If your commit contains breaking changes, please include `BREAKING CHANGE:` phrase in your commit footer. The body of the footer has to be multi-line and the footer line must start with “BREAKING CHANGE:”
```
$ git add .

$ git commit -m "feat(tab): upgrade react-scirpts
BREAKING CHANGE: drop support for Node 12"

$ git push
```

## How to debug templates?

1. Set `TEAMSFX_DEBUG_TEMPLATE=true` to your environment variables.
1. Add your changes in templates source code.
1. cd to vscode-extension folder.
1. F5 to local debug and create new project.
1. The `FetchTemplateZipFromSourceCode` action will get template from the source code that you just changed.

* `FetchTemplatesUrlWithTag`, `FetchTemplatesZipFromUrl`, `FetchTemplateZipFromLocal`, these actions are skipped.
* Since bot's and messaging extension's templates are generated during CD pipeline, we can't debug those code with `FetchTemplateZipFromSourceCode` action.
