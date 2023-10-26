# Component fx-core guides

## Folder structure

### component/feature 

Each feature component maps to "Add Feature" command by implementing "add" method for corresponding "Add Feature" option.
  
### component/code

Code generators for Tab, Bot or API sub project.

### component/connection

Settings (App Settings ofr Auth Settings) bicep generators for Azure Web App, Azure Function and APIM.

### component/resource

Cloud resource components: Teams App, Microsoft Entra App, and Azure resources (Azure SQL, Azure Function, Azure Web App, Azure storage ...).

Resource components provide the following APIs:
* generateBicep - bicep for resource provisioning
* provision - extra works out of scope of bicep before bicep deployment
* configure - extra works out of scope of bicep after bicep deployment
* deploy - deploy code to cloud
  
## Action middleware

`ActionExecutionMW` is a common middleware that help to do some common tasks for each lifecycle action:
* telemetry: help to automatically send telemetry for each method execution.
* error handling: help to handle uncatched errors and convert into FxError.
* progress bar (start and end): help to automatically start and stop a progress bar.

The middleware is strongly suggested to use, or the component owner has to implement duplicated works for each action.

## Interface contract

### Resource component

APIs of resource components are called by the core module directly for `provision` and `deploy` commands. So the API contracts are followed by `CloudResource` interface:

```
export interface CloudResource {
  readonly name: string;
  readonly description?: string;
  readonly outputs: ResourceOutputs;
  readonly finalOutputKeys: string[];
  readonly secretKeys?: string[];
  generateBicep?: (
    context: ContextV3,
    inputs: InputsWithProjectPath,
    actionContext?: ActionContext
  ) => Promise<Result<Bicep[], FxError>>;
  provision?: (
    context: ProvisionContextV3,
    inputs: InputsWithProjectPath,
    actionContext?: ActionContext
  ) => Promise<Result<undefined, FxError>>;
  configure?: (
    context: ProvisionContextV3,
    inputs: InputsWithProjectPath,
    actionContext?: ActionContext
  ) => Promise<Result<undefined, FxError>>;
  deploy?: (
    context: ProvisionContextV3,
    inputs: InputsWithProjectPath,
    actionContext?: ActionContext
  ) => Promise<Result<undefined, FxError>>;
}
```

### Other components

For other action, feature owner can design interface for each scenario. There is no interface contracts on framework level. 
For example, Tab code generator can has totally different interface from the one of Bot code generator. Bot APIs are called by `teams-tab` or `teams-bot` feature component separately.

## Only feature component can update project settings for `Add Feature`

When adding some feature, the following types of files could be potentially added / modified in the project:

* Source code: provided by source code generators
* Bicep files: provided by resource components or connection components.
* App manifest file: provided by `app-manifest` component
* Microsoft Entra manifest file: provided by `aad-app` component
* Project setting file: updated by feature component

The first 4 types are created or updated by corresponding atomic components, while the last type (Project settings file) can be accessed by multiple components because it is wrapped in Context object. We don't suggest code generators or bicep generators be aware of the Context including project settings. The reason is that we hope the code of scaffold logic would keep unchanged if the Context object change in the future. In other words, the principle is that only feature component can update project settings.

