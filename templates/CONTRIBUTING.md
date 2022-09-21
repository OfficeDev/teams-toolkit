# Contributing

Welcome and thank you for your interest in contributing to TeamsFx templates! Before contributing to this project, please review this document for policies and procedures which will ease the contribution and review process for everyone. If you have any question, please raise your issue on github.

## Build the project

1. Clone this repo locally.
    ```
    > git clone https://github.com/OfficeDev/TeamsFx.git
    ```
1. Open a terminal and move into your local copy.
    ```
    > cd TeamsFx
    ```
1. Build the Template Builder package.
    ```
    > cd templates && npm install && npm run build
    ```

## Terminology

| Terminology | Description |
|---|---|
| Template | A template is the final output of Template Builder. Usually each template identifies one specific app scenario or feature. Each template will be packed into a zip file and be released. Teams Toolkit downloads the zip file for scaffolding. |
| Template Definition File | A template definition file in yaml format defines how to build template. |
| Template Assets | A set of reusable files that can be shared between different templates, e.g. BICEP file |

## Folder Structure

* `assets`  contains the template assets that compose a template.
* `definitions` contains the yaml files that define templates.
* `scenarios` contains the output of template builder, each sub folder containing a complete template source code. Each template will be zipped and released by CD pipeline. A final template can be composed of several assets.
* `src` contains the source code of template builder. Template owners can run the command in the src folder to generate their template source code in scenarios folder. The definition filename will be the template name. You do not need to edit any file in `src` if you just want to add a template.

## How to add a new template?

1. Add your template definition yaml file under the `definitions` folder.
1. Add your new template assets under the `assets` folder, and refer to the assets in your template definition.
    For example, you may need to add CSharp code for command-and-response bot. Then go to `assets/code/csharp` folder, create a new folder named `command-and-response` and put your source code in it. Finally, refer to your new assets in your template definition:
    ```
    assets:
      # Copy application code
      - copy: code/csharp/command-and-response     # Relative path to 'assets'.
        to: .                                      # Relative path to the destination folder. 'to' can be omitted if it is '.'.
    ```
1. Generate template source code with Template Builder.
    ```
    > cd src
    > npm run generate ../definitions/<your-definition-file>
    ```
1. Check the output template source code and ensure it works as expected. Go [How to debug templates?](#how-to-debug-templates) for more details.
1. Commit both your definition file and the template source code.

## How to synchronize template asset changes to templates?

Assuming each template asset is referenced by at least one template. When updating a template asset, you must apply the change to related templates.

1. Add your changes to existing template asset file.
1. You have no need to figure out which template should be updated. Run the following command to re-generate all templates:
    ```
    > cd src
    > npm run generate:all
    ```
1. Commit both your asset changes and template changes.

## How to scaffold from pre-release templates?

Teams Toolkit downloads latest stable templates by default from [GitHub releases](https://github.com/OfficeDev/TeamsFx/releases) for scaffolding.

To scaffold your project from rc templates, set the environment varaible `TEAMSFX_TEMPLATE_PRERELEASE=rc`. Then Teams Toolkit download templates from [rc release](https://github.com/OfficeDev/TeamsFx/releases/tag/templates%400.0.0-rc)

To scaffold from alpha release templates, set `TEAMSFX_TEMPLATE_PRERELEASE=alpha`. Then Teams Toolkit download templates from [rc release](https://github.com/OfficeDev/TeamsFx/releases/tag/templates%400.0.0-alpha)

## How to release a new template?

1. Add the relative path to your new template in [package.json](https://github.com/OfficeDev/TeamsFx/blob/dev/templates/package.json)
  ```
  "templates": [
        "scenarios/command-and-response-js",
        "scenarios/command-and-response-ts",
        "scenarios/command-and-response-csharp",
        ...
  ]
  ```
2. In cd pipeline, all templates in the list will be zipped and be released to GitHub.

3. If your new template can not be scaffolded by older version Teams Toolkit, you need to commit your changes with a `BREAKING CHANGE` footer. The body of the footer has to be multi-line and the footer line must start with `BREAKING CHANGE:`
```
$ git add .

$ git commit -m "feat(tab): upgrade react-scirpts
BREAKING CHANGE: drop support for Node 12"

$ git push
```

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
