# Contributing

Welcome and thank you for your interest in contributing to **Simple Auth**! Before contributing to this project, please review this document for policies and procedures which will ease the contribution and review process for everyone. If you have questions, please raise your issue on github.

## Setup develop environment

Follow the official documents to install the required softwares:
1. [.NET Core SDK 3.1](https://dotnet.microsoft.com/download/dotnet-core/3.1)
2. [Visual Studio 2019](https://visualstudio.microsoft.com/vs/) or [Visual Studio Code](https://code.visualstudio.com/)

## Built the project

Build in Visual Studio directly, or use `dotnet build` command under root folder.

## Debug the project

1. Set proper value for the configurations in `./src/TeamsFxSimpleAuth/appsettings.json`. Follow README for how to set the configurations.
1. Change solution configuration to `Debug` in Visual Studio.
1. Set `TeamsFxSimpleAuth` as start up project in Visual Studio.
1. Press F5 to start the project in debug mode.

## Test the project

### Prepare test resources

You only need to take following steps once.
1. Register your M365 subscription at https://developer.microsoft.com/en-us/microsoft-365. Record the username, password for your admin account, and tenant id for your M365 tenant.
2. Create an AAD app registration named `teamsfx-integration-test-main-app` using admin account from step 1. Record the client id of this app.
3. Configure the AAD app registration created in step 2:
    1. Add redirect uri: https://localhost. The redirect uri does not need to be valid. The test framework will parse the AAD response from redirect uri.
    2. Generate client secret, record the generated secret.
    3. Configure following application permission and grant admin consent for them in Azure Portal:
        1. Application.ReadWrite.All
        2. Application.ReadWrite.OwnedBy
        3. Policy.Read.All
        4. Policy.ReadWrite.ApplicationConfiguration
4. Create a test user account under M365 tenant. **Remember to update password after first sign in**.
5. Update the integration test configuration `./src/TeamsFxSimpleAuth.Tests/appsettings.IntegrationTest.json`
    ```
    "OAUTH_TOKEN_ENDPOINT": "https://login.microsoftonline.com/<your-M365-tenant-id>/oauth2/v2.0/token",
    "IntegrationTestSettings": {
        "TenantId": "<your-M365-tenant-id>",
        "AdminClientId": "<your-main-app-client-id>",
        "AdminClientSecret": "<your-main-app-client-secret>",
        "AuthorizeUrl": "https://login.microsoftonline.com/<your-M365-tenant-id>/oauth2/v2.0/authorize",
        "ApiAppIdUri": "api://localhost",
        "RedirectUri": "https://localhost",
        "CodeVerifier": "CodeVerifier_for_SimpleAuth_Integration_test",
        "TestUsername": "<your-authorized-test-user-account>",
        "TestPassword": "<password-for-authorized-test-user-account>",
        "TestUsername2": "<your-another-authorized-test-user-account>",
        "TestPassword2": "<password-for-another-authorized-test-user-account>",
        "Scope": "access_as_user"
    }
    ```
6. Install [Google Chrome](https://www.google.com/chrome/) on your development machine.
7. Install [ChromeDriver](https://chromedriver.chromium.org/) on your development machine, make sure the major version is same with Google Chrome version installed on your development machine.
8. Update the version of nuget package `Selenium.WebDriver.ChromeDriver` in `TeamsFxSimpleAuth.Test`, make sure the major version is same with Google Chrome version installed on your development machine. **Please do not commit this version change**.

### Run test cases

Right click `TeamsFxSimpleAuth.Test` project in Visual Studio, and choose `Run Tests`.

### Debug test cases

1. Change solution configuration to `Debug` in Visual Studio.
1. Navigate to the test case source code you want to debug.
1. Right click the test case and choose `Debug Test(s)`.

## Style Guidelines

The project already enabled StyleCop. Please fix the style warnings before commit.

## Pull Request Process

1. Create a pull request with your changes.
1. Make sure all the checks in pull request are passed.
1. At least one approve from other developers is required.
