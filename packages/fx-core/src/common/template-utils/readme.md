
## How to debug templates?

1. Set **DEBUG_TEMPLATE=true** to your environment variables.
1. Add your changes in templates source code.
1. cd to vscode-extension folder.
1. F5 to local debug and create new project.
1. The `FetchTemplateZipFromSourceCode` action will get template from the source code that you just changed.

* `FetchTemplatesUrlWithTag`, `FetchTemplatesZipFromUrl`, `FetchTemplateZipFromLocal`, these actions are skipped.
* Since bot's and message extension's templates are generated during CD pipeline, we can't debug those code with `FetchTemplateZipFromSourceCode` action.
