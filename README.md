# Microsoft Teams Toolkit

[![E2E Test workflow](https://github.com/OfficeDev/TeamsFx/actions/workflows/e2e-test.yml/badge.svg)](https://github.com/OfficeDev/TeamsFx/actions/workflows/e2e-test.yml)
[![SDK CI workflow](https://github.com/OfficeDev/TeamsFx/actions/workflows/sdk-ci.yml/badge.svg)](https://github.com/OfficeDev/TeamsFx/actions/workflows/sdk-ci.yml)
[![DotNet SDK CI workflow](https://github.com/OfficeDev/TeamsFx/actions/workflows/dotnetsdk-ci.yml/badge.svg)](https://github.com/OfficeDev/TeamsFx/actions/workflows/dotnetsdk-ci.yml)
[![Function Extension CI workflow](https://github.com/OfficeDev/TeamsFx/actions/workflows/FunctionExtensionCI.yml/badge.svg)](https://github.com/OfficeDev/TeamsFx/actions/workflows/FunctionExtensionCI.yml)

Microsoft Teams Toolkit is a Visual Studio Code extension (along with a corresponding CLI) that simplifies building applications for Microsoft Teams.

The Teams Toolkit includes:

- IDE extensions for Visual Studio and Visual Studio Code
- A command line tool `teamsfx` for terminal users, automation, and CI
- A code library, Teams Framework `teamsfx`, that provides runtime support to ease development

This repository contains the following packages:
| Package | Description |
| ----------- | ----------- |
| **Visual Studio Code Extension** [packages/vscode-extension](https://github.com/OfficeDev/TeamsFx/tree/main/packages/vscode-extension) | The extension named "Teams Toolkit" enables you to scaffold, run, debug, and deploy custom Teams apps directly from Visual Studio Code. It provides all the features of the CLI tool `teamsfx` integrated into the IDE, as well as easy access to more samples, docs and tools. |
| **TeamsFx CLI**  [packages/cli](https://github.com/OfficeDev/TeamsFx/tree/main/packages/cli) | Whether you prefer keyboard-centric developer operations, or you are automating your CI/CD pipeline, the `teamsfx` command line tool offers the same features as the IDE extensions.  |
| **SDK** [packages/sdk](https://github.com/OfficeDev/TeamsFx/tree/main/packages/sdk) | The main TeamsFx code library encapsulating simple authentication for both client and server-side code tailored for Teams developers. |
| **API** [packages/api](https://github.com/OfficeDev/TeamsFx/tree/main/packages/api) | The TeamsFx API is a collection of contracts supported by the IDE Extensions and CLI. It enables developers to write plugins to extend TeamsFx with new capabilities. |
| **Core** [packages/fx-core](https://github.com/OfficeDev/TeamsFx/tree/main/packages/fx-core) | The Core package centralizes implementation of capabilities shared by the IDE Extensions and the CLI. |
| **Azure Functions Support** [packages/function-extension](https://github.com/OfficeDev/TeamsFx/tree/main/packages/function-extension) | TeamsFx helps developers include server-side code in their Teams application backed by [Azure Functions](https://docs.microsoft.com/azure/azure-functions/). This plugin adds support to simplify the integration of an authentication-aware Azure Function into your Teams app. |

## Getting Started

Pick your preferred tool to get started:

- For JavaScript and TypeScript developers, install [Teams Toolkit for Visual Studio Code](https://docs.microsoft.com/microsoftteams/platform/toolkit/teams-toolkit-fundamentals#install-teams-toolkit-for-visual-studio-code).
- For .NET developers, install [Teams Toolkit for Visual Studio](https://docs.microsoft.com/microsoftteams/platform/toolkit/visual-studio-overview#install-teams-toolkit-for-visual-studio).
- For command line users, install [TeamsFx CLI](https://docs.microsoft.com/microsoftteams/platform/toolkit/teamsfx-cli#get-started): `npm install -g @microsoft/teamsfx-cli`

Follow [the documentation](https://aka.ms/teamsfx-docs) to start building apps for Microsoft Teams.

## Contributing

This project welcomes contributions and suggestions.  Most contributions require you to agree to a
Contributor License Agreement (CLA) declaring that you have the right to, and actually do, grant us
the rights to use your contribution. For details, visit [Contributor License Agreement](https://cla.opensource.microsoft.com).

When you submit a pull request, a CLA bot will automatically determine whether you need to provide
a CLA and decorate the PR appropriately (e.g., status check, comment). Simply follow the instructions
provided by the bot. You will only need to do this once across all repos using our CLA.

- Download our latest daily Builds [here](https://github.com/OfficeDev/TeamsFx/releases)
- Check out our [contribution](https://github.com/OfficeDev/TeamsFx/blob/main/CONTRIBUTING.md) page for more information

## Data/Telemetry

Teams Toolkit collects usage data and sends it to Microsoft to help improve our products and services. Read our [Privacy Statement](https://privacy.microsoft.com/privacystatement) and [Data Collection Notice](https://docs.opensource.microsoft.com/content/releasing/telemetry.html) to learn more. Learn more in our [FAQ](https://code.visualstudio.com/docs/supporting/faq#_how-to-disable-telemetry-reporting).

## Reporting security issues and bugs

Security issues and bugs should be reported privately, via email, to the Microsoft Security Response Center (MSRC) secure@microsoft.com. You should receive a response within 24 hours. If for some reason you do not, please follow up via email to ensure we received your original message. Further information, including the MSRC PGP key, can be found in the [Security TechCenter](https://www.microsoft.com/msrc/faqs-report-an-issue?rtc=1).

## Trademarks

This project may contain trademarks or logos for projects, products, or services. Authorized use of Microsoft
trademarks or logos is subject to and must follow
[Microsoft's Trademark & Brand Guidelines](https://www.microsoft.com/legal/intellectualproperty/trademarks/usage/general).
Use of Microsoft trademarks or logos in modified versions of this project must not cause confusion or imply Microsoft sponsorship.
Any use of third-party trademarks or logos are subject to those third-party's policies.

## Code of Conduct

This project has adopted the [Microsoft Open Source Code of Conduct](https://opensource.microsoft.com/codeofconduct/).
For more information see the [Code of Conduct FAQ](https://opensource.microsoft.com/codeofconduct/faq/) or
contact [opencode@microsoft.com](mailto:opencode@microsoft.com) with any additional questions or comments.
