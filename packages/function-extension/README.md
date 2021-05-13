# Microsoft.Azure.WebJobs.Extensions.TeamsFx

## Introduction

`TeamsFx` function extension does the following work for Teams app developers:
1. Do authorization for http trigger:
  - Http request must have Authorization header with access token, the client id of which should be in the list of `ALLOWED_APP_IDS` or equals to `M365_CLIENT_ID` setting. 
2. Refresh user access token in request header if it's about to expire.
3. Provide user access token in `TeamsFxContext` as Azure Functions input binding.

## Usage

### How to get the package
The package is published to [nuget.org](https://www.nuget.org/) with package id `Microsoft.Azure.WebJobs.Extensions.TeamsFx`. You can use your favorite tool to install the package to your project.

### JavaScript

#### Prerequsite

1. [Azure Functions Core Tools v3](https://docs.microsoft.com/en-us/azure/azure-functions/functions-run-local?tabs=windows%2Ccsharp%2Cbash#install-the-azure-functions-core-tools).

    Azure Functions Core Tools currently depends on the Azure CLI for authenticating with your Azure account. This means that you must [install the Azure CLI locally](https://docs.microsoft.com/en-us/cli/azure/install-azure-cli) to be able to publish to Azure from Azure Functions Core Tools.

2. .NET Core 3.1 SDK

#### Create function app with extension

1. In a new folder, create a new JavaScript HTTP trigger Azure Functions app.
    
    ```shell
    $ func new --template "Http Trigger" --name MyHttpTrigger
    ```

    Select `node` for worker runtime and `javascript` for language.

2. Remove the `extensionBundle` section in *host.json*.

3. In the function app root folder, explicitily install TeamsFx binding extension.
    
    ```
    func extensions install --package Microsoft.Azure.WebJobs.Extensions.TeamsFx --version <TARGET_VERSION>
    ```

    You can see a *extensions.csproj* file being added to your root directory.

4. Refer TeamsFx binding in *function.json*.

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

5. Get TeamsFxConfig in function's *index.js*.

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

6. Add parameters in *local.settings.json*.

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

## FAQ

1. Function app unable to start after deploying to Azure portal (getting 404 when invoke the deployed function).

    Make sure nuget packages are successfully restored before publishing the function app.

## Data Collection. 

The software may collect information about you and your use of the software and send it to Microsoft. Microsoft may use this information to provide services and improve our products and services. You may turn off the telemetry as described in the repository. There are also some features in the software that may enable you and Microsoft to collect data from users of your applications. If you use these features, you must comply with applicable law, including providing appropriate notices to users of your applications together with a copy of Microsoft's privacy statement. Our privacy statement is located at https://go.microsoft.com/fwlink/?LinkID=824704. You can learn more about data collection and use in the help documentation and our privacy statement. Your use of the software operates as your consent to these practices.


## Code of Conduct

This project has adopted the [Microsoft Open Source Code of Conduct](https://opensource.microsoft.com/codeofconduct/). For more information see the [Code of Conduct FAQ](https://opensource.microsoft.com/codeofconduct/faq/) or contact [opencode@microsoft.com](mailto:opencode@microsoft.com) with any additional questions or comments.


## Contributing

There are many ways in which you can participate in the project, for example:

* [Submit bugs and feature requests](https://github.com/OfficeDev/TeamsFx/issues), and help us verify as they are checked in
* Review [source code changes](https://github.com/OfficeDev/TeamsFx/pulls)

If you are interested in fixing issues and contributing directly to the code base, please see the [Contributing Guide](./CONTRIBUTING.md).

## Reporting Security Issues

**Please do not report security vulnerabilities through public GitHub issues.**

Instead, please report them to the Microsoft Security Response Center (MSRC) at [https://msrc.microsoft.com/create-report](https://msrc.microsoft.com/create-report).

If you prefer to submit without logging in, send email to [secure@microsoft.com](mailto:secure@microsoft.com).  If possible, encrypt your message with our PGP key; please download it from the the [Microsoft Security Response Center PGP Key page](https://www.microsoft.com/en-us/msrc/pgp-key-msrc).

You should receive a response within 24 hours. If for some reason you do not, please follow up via email to ensure we received your original message. Additional information can be found at [microsoft.com/msrc](https://www.microsoft.com/msrc).

## Trademarks 

This project may contain trademarks or logos for projects, products, or services. Authorized use of Microsoft trademarks or logos is subject to and must follow [Microsoft's Trademark & Brand Guidelines](https://www.microsoft.com/en-us/legal/intellectualproperty/trademarks/usage/general). Use of Microsoft trademarks or logos in modified versions of this project must not cause confusion or imply Microsoft sponsorship. Any use of third-party trademarks or logos are subject to those third-party's policies.

## License

Copyright (c) Microsoft Corporation. All rights reserved.

Licensed under the [MIT](LICENSE.txt) license.

