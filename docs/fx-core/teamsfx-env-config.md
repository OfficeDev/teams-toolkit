## TeamsFx Environment Configuration

TeamsFx environment configuration file is for user customization during the app development with Teams Toolkit, including the customization of provisioned azure resources, Teams app manifest, and data plane operations. Also, different environments can have different TeamsFx environment configurations.

### Name of TeamsFx Environment Configuration File

When new environment is created, a new TeamsFx environment configuration file will be created under `.fx` with the name like `config.<env_name>.json`. Take the environment `test` for example, the corresponding TeamsFx environment configuration file is `config.test.json`.

### Schema of TeamsFx Environment Configuration

Json schema is used to define all the available parameters in TeamsFx environment configuration. The full definitions of the schema can be found [here](../../packages/api/src/schemas/envConfig.json).

Below is the introduction of all the available parameters.

#### Auth

This is for re-using an existing AAD app to enable auth in a Teams app. 

The configuration is **optional**. If provided, Teams Toolkit will use this existing AAD app for auth usage and won't provision a new one.

| Key | Type | Description |
| - | - | - |
| auth.clientId | string | The client id of existing AAD app for Teams app. |
| auth.clientSecret | string | The client secret of existing AAD app for Teams app. |
| auth.objectId | string | The object id of existing AAD app for Teams app. |
| auth.accessAsUserScopeId | string | The access_as_user scope id of existing AAD app for Teams app. |

#### Azure

This is for the Azure resource related configuration. 

The configuration is **optional**. If provided, Teams Toolkit will use the subscription and resource group for azure resources provision, otherwise dialog will be popped-up to ask the subscription and resource group.

| Key | Type | Description |
| - | - | - |
| azure.subscriptionId | string | The subscription to provision Azure resources. |
| azure.resourceGroupName | string | The existing resource group to provision Azure resources. |

#### Bot

This is for existing bot AAD app configuration.

The configuration is **optional**. If provided, Teams Toolkit will use this existing bot AAD app and won't provision a new one.

| Key | Type | Description |
| - | - | - |
| bot.appId | string | The id of existing bot AAD app. |
| bot.appPassword | string | The password of existing bot AAD app. |

#### Manifest

This is for Teams app manifest customization.

The configuration is **required**. Teams Toolkit will use the value to render Teams app manifest.

| Key | Type | Description |
| - | - | - |
| manifest.appName.short | string | **Required**. The short display name for teams app. |
| manifest.appName.full | string | The full name for teams app. |

Above are predefined parameters for Teams app manifest customization. You can also add new parameters to the Teams app manifest template file named `manifest.source.json` under `templates/appPackage` and set its value in TeamsFx environment configuration. The Teams app manifest template file leverages [mustache](https://mustache.github.io/) as the template rendering engine, so you need define parameters with mustache syntax in the template.

Here's a sample snippet from `manifest.source.json` with parameters using mustache syntax:

```json
{
    "name": {
        "short": "{{config.manifest.appName.short}}",
        "full": "{{config.manifest.appName.full}}"
    },
    "description": {
        "short": "Short description of {{config.manifest.appName.short}}",
        "full": "Full description of {{config.manifest.appName.short}}"
    },
}
```

#### Others

| Key | Type | Description |
| - | - | - |
| skipAddingSqlUser | bool | Skip to add user during SQL provision. |

#### Sample TeamsFx Environment Configuration

```json
{
    "$schema": "https://raw.githubusercontent.com/OfficeDev/TeamsFx/dev/packages/api/src/schemas/envConfig.json",
    "description": "You can customize the TeamsFx config for different environments. Visit https://aka.ms/teamsfx-config to learn more about this.",
    "azure": {
        "subscriptionId": "xxx-xxxx-xxxx-xxx",
        "resourceGroupName": "xx"
    },
    "manifest": {
        "appName": {
            "short": "My Teams App",
            "full": "Full name of My Teams App"
        }
    },
    "skipAddingSqlUser": true
}
```
