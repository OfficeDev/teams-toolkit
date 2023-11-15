# teamsapp Command Line Interface

teamsapp CLI is a text-based command line interface that accelerates Teams application development. It aims you to provide keyboard-centric experience when building Teams applications. It also enables CI/CD scenario where CLI can be easily integrated in scripts for automation.

* [Source code](https://github.com/OfficeDev/teamsapp/tree/dev/packages/cli) 
* [Package (NPM)](https://www.npmjs.com/package/@microsoft/teamsapp-cli)

## Get Started

Let's start by installing `teamsapp-cli` from `npm` and run `teamsapp -h` to check all available commands:

```bash
  npm install -g @microsoft/teamsapp-cli
  teamsapp -h
```

## Supported Commands

| `teamsapp` Commands  | Descriptions |
|:----------------  |:-------------|
|`teamsapp add` | Add feature to your Microsoft Teams application. |
|`teamsapp auth` | Manage Microsoft 365 and Azure accounts. |
|`teamsapp collaborator` | Check, grant and list permissions for who can access and manage Microsoft Teams application and Microsoft Entra application. |
|`teamsapp deploy [options]` | Run the deploy stage in teamsapp.yml or teamsapp.local.yml.|
|`teamsapp doctor [options]` | Prerequiste checker for building Microsoft Teams apps. |
|`teamsapp entra-app` | Manage the Microsoft Entra app in the current application.|
|`teamsapp env` | Manage environments.|
|`teamsapp help` | Show Microsoft Teams Toolkit CLI help.|
|`teamsapp install` | Sideload a given application package across Microsoft 365.|
|`teamsapp launchinfo` | Get launch information of an acquired M365 App.|
|`teamsapp list` | List available Microsoft Teams application templates and samples.|
|`teamsapp new` | Create a new Microsoft Teams application.|
|`teamsapp package` | Build your Microsoft Teams app into a package for publishing.|
|`teamsapp preview` | Preview the current application.|
|`teamsapp provision` | Run the provision stage in teamsapp.yml or teamsapp.local.yml.|
|`teamsapp publish` | Run the publish stage in teamsapp.yml.|
|`teamsapp uninstall` | Remove an acquired M365 App.|
|`teamsapp update` | Update the Microsoft Teams App manifest to Teams Developer Portal.|
|`teamsapp upgrade` | Upgrade the project to work with the latest version of Teams Toolkit.|
|`teamsapp validate` | Validate the Microsoft Teams app using manifest schema or validation rules.|

## `teamsapp new`

`teamsapp new` will by default go into interactive mode and guide you through the process of creating a new Teams application by asking few questions. You can also do it in non-interactive mode by setting `--interactive` flag to `false`.

| `teamsapp new` Commands  | Descriptions |
|:----------------  |:-------------|
| `teamsapp new sample <sample-id>`     | Create an app from an existing sample |
| `teamsapp list samples`     | List all the available samples|

### Parameters for `teamsapp new`

| Parameters  | Required | Descriptions |
|:----------------  |:-------------|:-------------|
| `capability` | Yes | Specifies the Microsoft Teams App capability. Allowed value: ["bot", "ai-bot", "ai-assistant-bot", etc.]. Use 'teamsfx list templates' to see all available options. |
| `bot-host-type-trigger` | No | Specifies the trigger for `Chat Notification Message` app template. Allowed value: ["http-restify", "http-webapi", "http-and-timer-functions", etc.]. Default value: "http-restify". |
| `spfx-solution` | No | Create a new or import an existing SharePoint Framework solution. Allowed value: ["new", "import"]. Default value: "new". |
| `spfx-install-latest-package` | No | Install the latest version of SharePoint Framework. Default value: true. |
| `spfx-framework-type` | No | Framework. Allowed value: ["react", "minimal", "none"]. Default value: "react". |
| `spfx-webpart-name` | No | Name for SharePoint Framework Web Part. Default value: "helloworld". |
| `spfx-folder` | No | Directory or Path that contains the existing SharePoint Framework solution. |
| `me-architecture` | No | Architecture of Search Based Message Extension. Allowed value: ["new-api", "api-spec", "bot-plugin"]. Default value: "new-api". |
| `openapi-spec-location` | No | OpenAPI description document location. |
| `api-operation` | No | Select Operation(s) Teams Can Interact with. |
| `programming-language` | No | Programming Language Allowed value: ["javascript", "typescript", "csharp"]. Default value: "javascript". |
| `folder` | No | Directory where the project folder will be created in. Default value: "./". |
| `app-name | Yes | Application name. |

### Scenarios for `teamsapp new`

Using interactive mode to create a Teams app is super intuitive, please try it by starting with `teamsapp new`. The following are the few scenerios on controlling all the parameters:

#### Create a new timer triggered notification bot

```bash
teamsapp new -c notification -t timer-functions -l typescript -n myapp -i false
```

#### Import an existing SharePoint Framework solution

```bash
teamsapp new -c tab-spfx -s import --spfx-folder <folder-path> -n myapp -i false
```

## `teamsapp auth`

Manage cloud service accounts. The supported cloud services are `Azure` and `Microsoft 365`.

| `teamsapp auth` Commands  | Descriptions |
|:----------------  |:-------------|
| `teamsapp auth list`       | Display all connected cloud accounts information. |
| `teamsapp auth login <service>`      | Log in to the selected cloud service. |
| `teamsapp auth logout <service>`      | log out of selected cloud service. |

## `teamsapp env`

Manage the environments.

| `teamsapp env` Commands  | Descriptions |
|:----------------  |:-------------|
| `teamsapp env add <new_env_name> --env <existing_env_name>` | Add a new environment by copying from the specified environment. |
| `teamsapp env list` | List all environments. |

### Scenarios for `teamsapp env`

#### Create a new environment

Add a new environment by copying from the existing dev environment:

```bash
teamsapp env add staging --env dev
```

## `teamsapp provision`

Provision the cloud resources in the current application.

### Parameters for `teamsapp provision`

| Parameters  | Required | Descriptions |
|:----------------  |:-------------|:-------------|
|`--env`| Yes| Specifies the environment name for the project scaffolded by Microsoft Teams Toolkit. |
|`--folder`| No | Project folder. Default value: "./". |

## `teamsapp deploy`

This command is used to deploy the current application. By default it will deploy entire project but it's also possible to deploy partially. Options(Multiple) are: `frontend-hosting`, `function`, `apim`, `teamsbot`, `spfx`.

### Parameters for `teamsapp deploy`

| Parameters  | Required | Descriptions |
|:----------------  |:-------------|:-------------|
|`--env`| Yes| Specifies the environment name for the project scaffolded by Microsoft Teams Toolkit. |
|`--folder`| No | Project folder. Default value: "./". |

## `teamsapp validate`

Validate current application. This command will validate your application's manifest file.

### Parameters for `teamsapp validate`

| Parameters  | Required | Descriptions |
|:----------------  |:-------------|:-------------|
|`manifest-file`| No | Specifies the Microsoft Teams app manifest file path. Default value: "./appPackage/manifest.json".|
|`package-file`| No | Specifies the zipped Microsoft Teams app package file path.|
|`output-package-file`| No | Specifies the output zipped Microsoft Teams app package file path. Default value: "./appPackage/build/appPackage.${env}.zip".|
|`output-manifest-file`| No | Specifies the output Microsoft Teams app manifest file path. Default value: "./appPackage/build/manifest.${env}.json".|
|`env`| No | Specifies the environment name for the project scaffolded by Microsoft Teams Toolkit.|
|`env-file`| No | Specifies the .env file that defines the variables to replace in the Teams app manifest template file.|
|`folder`| No | Project folder. Default value: "./". |

## `teamsapp publish`

Publish the app to Teams.

### Parameters for `teamsapp publish`

| Parameters  | Required | Descriptions |
|:----------------  |:-------------|:-------------|
|`manifest-file`| No | Specifies the Microsoft Teams app manifest file path. Default value: "./appPackage/manifest.json".|
|`package-file`| No | Specifies the zipped Microsoft Teams app package file path.|
|`output-package-file`| No | Specifies the output zipped Microsoft Teams app package file path. Default value: "./appPackage/build/appPackage.${env}.zip".|
|`output-manifest-file`| No | Specifies the output Microsoft Teams app manifest file path. Default value: "./appPackage/build/manifest.${env}.json".|
|`env`| No | Specifies the environment name for the project scaffolded by Microsoft Teams Toolkit.|
|`env-file`| No | Specifies the .env file that defines the variables to replace in the Teams app manifest template file.|
|`folder`| No | Project folder. Default value: "./". |

## `teamsapp package`

Build your Teams app into a package for publishing.
### Parameters for `teamsapp publish`

| Parameters  | Required | Descriptions |
|:----------------  |:-------------|:-------------|
|`manifest-file`| No | Specifies the Microsoft Teams app manifest file path. Default value: "./appPackage/manifest.json".|
|`output-package-file`| No | Specifies the output zipped Microsoft Teams app package file path. Default value: "./appPackage/build/appPackage.${env}.zip".|
|`output-manifest-file`| No | Specifies the output Microsoft Teams app manifest file path. Default value: "./appPackage/build/manifest.${env}.json".|
|`env`| No | Specifies the environment name for the project scaffolded by Microsoft Teams Toolkit.|
|`env-file`| No | Specifies the .env file that defines the variables to replace in the Teams app manifest template file.|
|`folder`| No | Project folder. Default value: "./". |

## `teamsapp preview`

Preview the current application from local or remote.

### Parameters for `teamsapp preview`

| Parameters  | Required | Descriptions |
|:----------------  |:-------------|:-------------|
|`m365-host` | No | Preview the application in Teams, Outlook or the Microsoft 365 app. Allowed value: ["teams", "outlook", "office"]. Default value: "teams".| 
|`teams-manifest-file` | No | Specifies the Microsoft Teams app manifest template file path, it can be either absolute path or relative path to project root folder, defaults to './appPackage/manifest.json' Default value: "./appPackage/manifest.json".| 
|`run-command` | No | The command to start local service. Work for 'local' environment only. If undefined, teamsfx will use the auto detected one from project type (`npm run dev:teamsfx` or `dotnet run` or `func start`). If empty, teamsfx will skip starting local service. | 
|`running-pattern` | No | The ready signal output that service is launched. Work for 'local' environment only. If undefined, teamsfx will use the default common pattern ("started|successfully|finished|crashed|failed|listening"). If empty, teamsfx treats process start as ready signal.  | 
|`open-only` | No | Work for 'local' environment only. If true, directly open web client without launching local service. Default value: false. |
|`browser` | No | Select browser to open Microsoft Teams web client. Allowed value: ["chrome", "edge", "default"]. Default value: "default".|
|`browser-arg` | No | Argument to pass to the browser (e.g. --browser-args="--guest") |
|`exec-path` | No | The paths that will be added to the system environment variable PATH when the command is executed, defaults to "${folder}/devTools/func". Default value: "devTools/func". |
|`env` | No | Specifies the environment name for the project. Default value: "local".|
|`folder` | No | Project folder. Default value: "./".|

### Scenarios for `teamsapp preview`

#### Local Preview

Dependencies:

- Node.js
- .NET SDK
- Azure Functions Core Tools

```bash
teamsapp preview --env local
teamsapp preview --env local --browser chrome
```

#### Remote Preview

```bash
teamsapp preview --env dev
teamsapp preview --env dev --browser edge
```

> [!Note]
> The logs of the background services like React will be saved in `~/.fx/cli-log/local-preview/`.

## `teamsapp collaborator`

teamsapp CLI provides `teamsapp collaborator` Commands for collaboration scenario.

| `teamsapp collaborator` Commands | Descriptions |
|:------------------------------|-------------|
| `teamsapp collaborator grant --env --email` | Grant permission for collaborator's Microsoft 365 account for the project of a specified environment. |
| `teamsapp collaborator status` | Show permission status for the project |

### Parameters for `teamsapp collaborator grant`

| Parameters  | Required | Descriptions |
|:----------------  |:-------------|:-------------|
|`--env`| Yes | Provide env name. |
|`--email`| Yes | Provide collaborator's Microsoft 365 email address. Note that the collaborator's account should be in the same tenant with creator. |

### Parameters for `teamsapp collaborator status`

| Parameters  | Required | Descriptions |
|:----------------  |:-------------|:-------------|
|`--env`| Yes | Provide env name. |
|`--list-all-collaborators` | No | With this flag, Teams Toolkit CLI will print out all collaborators for this project. |

### Scenarios for `teamsapp collaborator`

Here are some examples, for better handling permission for `teamsapp` projects.

#### Grant Permission

Project creator and collaborators can use `teamsapp collaborator grant` command to add a new collaborator to the project:

```bash
teamsapp collaborator grant --env dev --email user-email@user-tenant.com
```

After successfully granted permission, project creator and collaborators can share the project with the new collaborator by Github, and the new collaborator will have all permission for Microsoft 365 account.

#### Show Permission Status

Project creator and collaborators can use `teamsapp collaborator status` command to view his Microsoft 365 account permission for specific env:

```bash
teamsapp collaborator status --env dev
```

#### List All Collaborators

Project creator and collaborators can use `teamsapp collaborator status` command to view all collaborators for specific env:

```bash
teamsapp collaborator status --env dev --list-all-collaborators
```

#### E2E Collaboration work flow in CLI

As a project creator:

- Create a new teamsapp Tab project (You can also select bot).

  ```bash
  teamsapp new -c notification -t timer-functions -l typescript -n myapp -i false
  ```

- Login Microsoft 365 account and Azure account.

  ```bash
  teamsapp auth login azure
  teamsapp auth login m365
  ```

- Provision your project.

  ```bash
  teamsapp provision
  ```

- View collaborators. You should see yourself here.

  ```bash
  teamsapp collaborator status --env dev --list-all-collaborators
  ```

  ![list-all-collaborators](TODO)
- Add another account as collaborator. Note that the added account must under the same tenant:

  ```bash
  teamsapp collaborator grant --env dev --email user-email@user-tenant.com
  ```

  ![add-new-collaborator](TODO)
- Push your project to GitHub

As a Project Collaborator:

- Clone the project from GitHub.
- Login Microsoft 365 account. Note that the Microsoft 365 account should be the same as added above:

  ```bash
  teamsapp auth login m365
  ```

- Login Azure account which has contributor permission for all the Azure resources.

  ```bash
  teamsapp auth login azure
  ```

- Check permission status. You should find yourself have the owner permission of the project:

  ```bash
  teamsapp collaborator status --env dev
  ```

  ![collaborator status](TODO)
- Update Tab code, and deploy the project to remote.
- Launch remote and the project should work fine.