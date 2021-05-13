# Contributing

Welcome and thank you for your interest in contributing to **VSCode Extension**! Before contributing to this project, please review this document for policies and procedures which will ease the contribution and review process for everyone. If you have questions, please raise your issue on github.

## Setup develop environment

### Prerequisites

Verify you have the right prerequisites for building Teams apps and install some recommended development tools. [Read more details](https://docs.microsoft.com/en-us/microsoftteams/platform/build-your-first-app/build-first-app-overview).

<table>
    <tr>
        <td><img src="https://raw.githubusercontent.com/HuihuiWu-Microsoft/Teams-Toolkit-V2/main/landingPage_nodejs.png"></td>
        <td><h3>Node.js</h3>As a fundamental runtime context for Teams app, Node.js v10.x, v12.x or v14.x is required (v12.x is recommended).</td>
    </tr>
    <tr>
        <td><img src="https://raw.githubusercontent.com/HuihuiWu-Microsoft/Teams-Toolkit-V2/main/landingPage_m365.png"></td>
        <td><h3>M365</h3>The Teams Toolkit requires a Microsoft 365 organizational account where Teams is running and has been registered.</td>
    </tr>
    <tr>
        <td><img src="https://raw.githubusercontent.com/HuihuiWu-Microsoft/Teams-Toolkit-V2/main/landingPage_azure.png"></td>
        <td><h3>Azure</h3> The Teams Toolkit may require an Azure account and subscription to deploy the Azure resources for your project.</td>
    </tr>
</table>

>Don’t have a M365 to experience building Teams app? Sign up for [Microsoft Developer Program](https://developer.microsoft.com/en-us/microsoft-365/dev-program), which allows you to have a testing tenant with preconfigured permissions.

### Built the project

1. Clone this repo locally. (`git clone https://github.com/OfficeDev/TeamsFx.git`)
1. Open a terminal and move into your local copy. (`cd TeamsFx`)
1. Because the monorepo is managed by Lerna, you need to bootstrap at the first time. (`npm run setup` or `npm install && npm run bootstrap`) All dependencies will be installed.
1. Build the vsix package. (`cd packages/vscode-extension && npm run build`)

### Debug the project
1. Open project in VS Code (`cd packages/vscode-extension && code .`) 
1. Press `F5` in VS Code.

## Test the project

Mannully test UI in VS Code extenion for now.

## Style Guidelines

The project already enabled StyleCop. Please fix the style warnings before commit.

## Pull Request Process

1. Check out a new branch from `main` branch.
1. Make sure all the checks in pull request are passed.
1. At least one approver from [CODEOWNER](../../.github/CODEOWNERS) is required.
