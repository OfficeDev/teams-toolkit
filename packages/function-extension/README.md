# Microsoft.Azure.WebJobs.Extensions.TeamsFx

## Introduction

`TeamsFx` input binding:
1. Gets environment variables from `local.settings.json` and environment configuration and provides `TeamsFxConfig` as input variable which can be used by TeamsFx SDK.
1. Do authorization for http trigger: Http request must have Authorization header with access token, the client id of which should be in the list of `ALLOWED_APP_IDS` or equals to `CLIENT_ID` setting. 
1. Refresh user access token if it's about to expire.


## Usage

### JavaScript

#### Prerequsite

1. [Azure Functions Core Tools v3](https://docs.microsoft.com/en-us/azure/azure-functions/functions-run-local?tabs=windows%2Ccsharp%2Cbash#install-the-azure-functions-core-tools).

    Azure Functions Core Tools currently depends on the Azure CLI for authenticating with your Azure account. This means that you must [install the Azure CLI locally](https://docs.microsoft.com/en-us/cli/azure/install-azure-cli) to be able to publish to Azure from Azure Functions Core Tools.

1. .NET Core 3.1 SDK

#### Create function app with extension

1. In a new folder, create a new JavaScript HTTP trigger Azure Functions app.
    
    ```shell
    $ func new --template "Http Trigger" --name MyHttpTrigger
    ```

    Select `node` for worker runtime and `javascript` for language.

1. Remove the `extensionBundle` section in *host.json*.

1. In the function app root folder, explicitily install TeamsFx binding extension.
    
    ```
    func extensions install --package Microsoft.Azure.WebJobs.Extensions.TeamsFx --version <TARGET_VERSION>
    ```

    You can see a *extensions.csproj* file being added to your root directory.

1. Refer TeamsFx binding in *function.json*.

    ```json
    {
      "bindings": [
        ...,
        {
          "direction": "in",
          "name": "myTeamsFxConfig",
          "type": "TeamsFx"
        }
      ]
    }
    ```

1. Get TeamsFxConfig in function's *index.js*.

    ```javascript
    module.exports = async function (context, req, myTeamsFxConfig) {
        context.log('JavaScript HTTP trigger function processed a request.');

        context.res = {
            status: 200, /* Defaults to 200 */
            body: JSON.stringify(myTeamsFxConfig)
        };
        context.done();
    }
    ```

1. Add parameters in *local.settings.json*.

    | Variable | Description |
    |-|-|
    | CLIENT_ID | Your AAD App client id. |
    | CLIENT_SECRET | Your AAD App client secret. |
    | ALLOWED_APP_IDS | List of client ids which are allowed to call the function app. Split by semicolon ';'  |
    | OAUTH_AUTHORITY | The authority is a URL that indicates a directory that MSAL can request tokens from. `https://login.microsoftonline.com/<tenant>/` |
    | FUNCTION_ENDPOINT | Your function app endpoint. |
    | SQL_ENDPOINT | Your SQL server endpoint. Add this config only when you are using SQL. |
    | DATABASE_NAME | Your database name. Add this config only when you are using database. |
    | IDENTITY_ID | Your identity id. Add this config only when have one. |

    Note: After you deploy the function app to azure portal, you can also override these settings in Azure Functions configuration.

#### Start the function app locally

```shell
func host start
```

You will find your function app listening at `http://localhost:7071/api/MyHttpTrigger`.

Use postman to send GET http request to `http://localhost:7071/api/MyHttpTrigger` with Header: `Authorization: Bearer <access-token>`.

#### Deploy your function app to Azure Portal

### C#

Sample C# Function: [FunctionAppCSharp](tests\TestAssets\FunctionAppCSharp)

## Change Logger Level

- Change logger level when debug locally

  Change `LogLevel` to `Debug` in *hosts.json*.
  ```json
  {
    "version": "2.0",
    "logging": {
      "logLevel": {
        "default": "Debug"
      }
    }
  }
  ```

- Change logger level on Azure Portal

  There are multiple solultions to change logger level on Azure portal:

  * Solution 1: Change `LogLevel` to `Debug` in *hosts.json* and re-deploy function app.
  * Solution 2: On Azure portal add `"AzureFunctionsJobHost__logging__LogLevel__Default": "Debug"` configuration and restart the function app.

  Debug log can be found from Kudu's `https://{function-app-name}.scm.azurewebsites.net/DebugConsole/?shell=powershell`: *LogFiles*-> *Applications* -> *Functions* -> *Hosts* -> *xxx.logs*

## Contributing

Please read our [CONTRIBUTING.md](CONTRIBUTING.md) which outlines all of our policies, procedures, and requirements for contributing to this project.

## FAQ

1. Function app unable to start after deploying to Azure portal (getting 404 when invoke the deployed function).

    Make sure nuget packages are successfully restored before publishing the function app.

# Project

> This repo has been populated by an initial template to help get you started. Please
> make sure to update the content to build a great experience for community-building.

As the maintainer of this project, please make a few updates:

- Improving this README.MD file to provide a great experience
- Updating SUPPORT.MD with content about this project's support experience
- Understanding the security reporting process in SECURITY.MD
- Remove this section from the README

## Contributing

This project welcomes contributions and suggestions.  Most contributions require you to agree to a
Contributor License Agreement (CLA) declaring that you have the right to, and actually do, grant us
the rights to use your contribution. For details, visit https://cla.opensource.microsoft.com.

When you submit a pull request, a CLA bot will automatically determine whether you need to provide
a CLA and decorate the PR appropriately (e.g., status check, comment). Simply follow the instructions
provided by the bot. You will only need to do this once across all repos using our CLA.

This project has adopted the [Microsoft Open Source Code of Conduct](https://opensource.microsoft.com/codeofconduct/).
For more information see the [Code of Conduct FAQ](https://opensource.microsoft.com/codeofconduct/faq/) or
contact [opencode@microsoft.com](mailto:opencode@microsoft.com) with any additional questions or comments.

## Trademarks

This project may contain trademarks or logos for projects, products, or services. Authorized use of Microsoft 
trademarks or logos is subject to and must follow 
[Microsoft's Trademark & Brand Guidelines](https://www.microsoft.com/en-us/legal/intellectualproperty/trademarks/usage/general).
Use of Microsoft trademarks or logos in modified versions of this project must not cause confusion or imply Microsoft sponsorship.
Any use of third-party trademarks or logos are subject to those third-party's policies.

