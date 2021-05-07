# Microsoft Teams App Framework (TeamsFx)
![workflow](https://github.com/OfficeDev/TeamsFx/actions/workflows/ci.yml/badge.svg)
![workflow](https://github.com/OfficeDev/TeamsFx/actions/workflows/e2e-test.yml/badge.svg)
![workflow](https://github.com/OfficeDev/TeamsFx/actions/workflows/sdk-ci.yml/badge.svg)
![workflow](https://github.com/OfficeDev/TeamsFx/actions/workflows/simpleauthCI.yml/badge.svg)
![workflow](https://github.com/OfficeDev/TeamsFx/actions/workflows/FunctionExtensionCI.yml/badge.svg)

The Microsoft Teams App Framework (TeamsFx) is a set of solution to help everyone and every organization to build their own Teams app quickly and easily. The TeamsFx mainly contains a VS Code Extension named Microsoft Teams Toolkit, CLI tool, and SDK which help developers to deal with common tasks in Team app building.


The TeamsFx contains the following packages, check 'packages' folder for more information.
| Package | Description | 
| ----------- | ----------- |
| [VS Code Extension](https://github.com/OfficeDev/TeamsFx/tree/main/packages/vscode-extension) | The [Microsoft Teams Toolkit](market extension link placeholder) enables you to create custom Teams apps directly within the Visual Studio Code environment. The toolkit guides you through the process and provides everything you need to build, debug, and launch your Teams app. |
| [CLI](https://github.com/OfficeDev/TeamsFx/tree/main/packages/cli) | A set of CLI tools in TeamsFx which provide same functionalities as VS Code extension for develoeprs who prefer keyboard-centric experience for Teams app building  |
| [SDK](https://github.com/OfficeDev/TeamsFx/tree/main/packages/sdk) | TeamsFx provides SDK to reduce develoeprs' programming work when dealing with Microsoft or Azure component and simplifies the autentication work for developers.  |
| [API](https://github.com/OfficeDev/TeamsFx/tree/main/packages/api) | TeamsFx API Pack is a collection of API contracts between TeamsFx Extension/CLI and TeamsFx core module. It defines the interfaces for 3rd party developer to write plugins to extend the toolkit capabilities. |
| [TeamsFx Core](https://github.com/OfficeDev/TeamsFx/tree/main/packages/fx-core) | TeamsFx Core package implements the core capabilities for VS Code Extension/CLI under TeamsFx API contracts. |
| [Function Extension](https://github.com/OfficeDev/TeamsFx/tree/main/packages/function-extension) | TeamsFx help developers build backend servers on hosted on [Azure Function](https://docs.microsoft.com/en-us/azure/azure-functions/). This extension adds bindings to help build backend API for Teams app. |
| [Simple Auth](https://github.com/OfficeDev/TeamsFx/tree/main/packages/simpleauth) | The Simple Auth is a backend service helping Teams tab app access first/third party services from client side.|

<br>

## Get Start
To start trying TeamsFx, check [Prerequest and Getting Start guidence](doc placeholder) first.

## Contributing

This project welcomes contributions and suggestions.  Most contributions require you to agree to a
Contributor License Agreement (CLA) declaring that you have the right to, and actually do, grant us
the rights to use your contribution. For details, visit https://cla.opensource.microsoft.com.

When you submit a pull request, a CLA bot will automatically determine whether you need to provide
a CLA and decorate the PR appropriately (e.g., status check, comment). Simply follow the instructions
provided by the bot. You will only need to do this once across all repos using our CLA.

- Download our latest daily Builds [here](https://github.com/OfficeDev/TeamsFx/releases)
- Check out the [Contributing]() page to see the best places to log issues and start discussions.

## Data/Telemetry
VS Code collects usage data and sends it to Microsoft to help improve our products and services. Read our [Privacy Statement](https://privacy.microsoft.com/en-us/privacystatement) and [Data Collection Notice](https://docs.opensource.microsoft.com/content/releasing/telemetry.html) to learn more. If you don't wish to send usage data to Microsoft, you can set the `telemetry.enableTelemetry` setting to false. Learn more in our [FAQ](https://code.visualstudio.com/docs/supporting/faq#_how-to-disable-telemetry-reporting).

## Reporting security issues and bugs
Security issues and bugs should be reported privately, via email, to the Microsoft Security Response Center (MSRC) secure@microsoft.com. You should receive a response within 24 hours. If for some reason you do not, please follow up via email to ensure we received your original message. Further information, including the MSRC PGP key, can be found in the [Security TechCenter](https://www.microsoft.com/en-us/msrc/faqs-report-an-issue?rtc=1).

## Trademarks

This project may contain trademarks or logos for projects, products, or services. Authorized use of Microsoft 
trademarks or logos is subject to and must follow 
[Microsoft's Trademark & Brand Guidelines](https://www.microsoft.com/en-us/legal/intellectualproperty/trademarks/usage/general).
Use of Microsoft trademarks or logos in modified versions of this project must not cause confusion or imply Microsoft sponsorship.
Any use of third-party trademarks or logos are subject to those third-party's policies.


## Code of Conduct
This project has adopted the [Microsoft Open Source Code of Conduct](https://opensource.microsoft.com/codeofconduct/).
For more information see the [Code of Conduct FAQ](https://opensource.microsoft.com/codeofconduct/faq/) or
contact [opencode@microsoft.com](mailto:opencode@microsoft.com) with any additional questions or comments.

