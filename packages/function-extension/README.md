# Microsoft.Azure.WebJobs.Extensions.TeamsFx

## Introduction

`TeamsFx` function extension does the following binding work for Teams app developers:
1. Do authorization for http trigger: Http request must have Authorization header with access token, the client id of which should be in the list of `ALLOWED_APP_IDS` or equals to `M365_CLIENT_ID` setting. 
1. Refresh user access token in request header if it's about to expire.
1. Provide user access token in `TeamsFxContext` as Azure Functions input binding.

## Usage

### How to get the package
The package is published to [nuget.org](https://www.nuget.org/) with package id `Microsoft.Azure.WebJobs.Extensions.TeamsFx`. You can use your favorite tool to install the package to your project.

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
    | M365_CLIENT_ID | Your AAD App client id. |
    | M365_CLIENT_SECRET | Your AAD App client secret. |
    | M365_AUTHORITY_HOST | Authority host for your AAD tenant. |
    | M365_TENANT_ID | Tenant id for your AAD tenant. |
    | ALLOWED_APP_IDS | List of client ids which are allowed to call the function app. Split by semicolon ';'  |

    Note: After you deploy the function app to azure portal, you can also override these settings in Azure Functions configuration.

#### Start the function app locally

```shell
func host start
```

You will find your function app listening at `http://localhost:7071/api/MyHttpTrigger`.

Use postman to send GET http request to `http://localhost:7071/api/MyHttpTrigger` with Header: `Authorization: Bearer <access-token>`. The `azp` or `appid` claim (which means client id) of access token should be same with the `M365_CLIENT_ID` configuration, or in the list of `ALLOWED_APP_IDS` configuration.
You can refer [OAuth 2.0 auth code grant](https://docs.microsoft.com/en-us/azure/active-directory/develop/v2-oauth2-auth-code-flow) to get an appropriate access token manually using your AAD app.

#### Deploy your function app to Azure Portal

You can refer deployment guidance in `Deploy functions` section of [Azure Functions](https://docs.microsoft.com/en-us/azure/azure-functions/) document.

### C#

You can use `TeamsFx` attribute in your function to use this binding. Configurations listed in JavaScript tutorial above are also required in C# functions.
Here is the sample C# function you can refer: [FunctionAppCSharp](tests\TestAssets\FunctionAppCSharp).

## Change Logger Level
The binding will log information to help you troubleshoot. You can adjust the log level based on your requirement.

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

## Code of Conduct
This project has adopted the [Microsoft Open Source Code of Conduct](https://opensource.microsoft.com/codeofconduct/).
For more information see the [Code of Conduct FAQ](https://opensource.microsoft.com/codeofconduct/faq/) or
contact [opencode@microsoft.com](mailto:opencode@microsoft.com) with any additional questions or comments.

## Reporting security issues and bugs
Security issues and bugs should be reported privately, via email, to the Microsoft Security Response Center (MSRC) secure@microsoft.com. You should receive a response within 24 hours. If for some reason you do not, please follow up via email to ensure we received your original message. Further information, including the MSRC PGP key, can be found in the [Security TechCenter](https://www.microsoft.com/en-us/msrc/faqs-report-an-issue?rtc=1).

## Trademarks
This project may contain trademarks or logos for projects, products, or services. Authorized use of Microsoft trademarks or logos is subject to and must follow [Microsoft's Trademark & Brand Guidelines](https://www.microsoft.com/en-us/legal/intellectualproperty/trademarks/usage/general). Use of Microsoft trademarks or logos in modified versions of this project must not cause confusion or imply Microsoft sponsorship. Any use of third-party trademarks or logos are subject to those third-party's policies.

## FAQ

1. Function app unable to start after deploying to Azure portal (getting 404 when invoke the deployed function).

    Make sure nuget packages are successfully restored before publishing the function app.
