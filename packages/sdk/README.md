# TeamsFx SDK for TypeScript/JavaScript

TeamsFx aims to reduce the developer tasks of leveraging Teams SSO and access to cloud resources down to single-line statements with "zero configuration".

Use the library to:

- Access core functionalities in client and server environment in a similar way.
- Write user authentication code in a simplified way.

[Source code](https://github.com/OfficeDev/TeamsFx/tree/main/packages/sdk) |
[Package (NPM)](https://www.npmjs.com/package/@microsoft/teamsfx) |
[API reference documentation](https://aka.ms/teamsfx-sdk-help) |
[Samples](https://github.com/OfficeDev/TeamsFx-Samples)

## Getting started

> Important: Please be advised that access tokens are stored in sessionStorage for you by default. This can make it possible for malicious code in your app (or code pasted into a console on your page) to access APIs at the same privilege level as your client application. Please ensure you only request the minimum necessary scopes from your client application, and perform any sensitive operations from server side code that your client has to authenticate with.

TeamsFx SDK is pre-configured in scaffolded project using Teams Toolkit extension for Visual Studio and vscode, or the `teamsfx` cli from the `teamsfx-cli` npm package.
Please check the [README](https://github.com/OfficeDev/TeamsFx/blob/main/packages/vscode-extension/README.md) to see how to create a Teams App project.

### Prerequisites

- Node.js version 10.x.x or higher
- A project created by the Teams Toolkit VS Code extension or `teamsfx` CLI tool.
- If your project has installed `botbuilder` related [packages](https://github.com/Microsoft/botbuilder-js#packages) as dependencies, ensure they are of the same version and the version `>= 4.15.0`. ([Issue - all of the BOTBUILDER packages should be the same version](https://github.com/BotBuilderCommunity/botbuilder-community-js/issues/57#issuecomment-508538548))

### Install the `@microsoft/teamsfx` package

Install the TeamsFx SDK for TypeScript/JavaScript with `npm`:

```bash
npm install @microsoft/teamsfx
```

### Scenarios

TeamsFx SDK is built to be used in browser and NodeJS environment. Common scenarios include:
- Teams tab application
- Azure Function
- Teams bot

### Create and authenticate a service like `MicrosoftGraphClient`

To create a graph client object to access the Microsoft Graph API, you will need the credential to do authentication. The SDK provides APIs to configure for developers. Please choose the proper identity type and follow below steps:

#### Invoke Graph API on behalf of Teams User (User Identity)

Use the snippet below:

```ts
// Equivalent to:
// const teamsfx = new TeamsFx(IdentityType.User, {
//   initiateLoginEndpoint: process.env.REACT_APP_START_LOGIN_PAGE_URL,
//   clientId: process.env.REACT_APP_CLIENT_ID,
// }
const teamsfx = new TeamsFx();
const graphClient = createMicrosoftGraphClient(teamsfx, ["User.Read"]); // Initializes MS Graph SDK using our MsGraphAuthProvider
const profile = await graphClient.api("/me").get(); // Get the profile of current user
```

#### Invoke Graph API without user (Application Identity)

It doesn't require the interaction with Teams user. You can call Microsoft Graph as application identity.
Use the snippet below:

```ts
// Equivalent to:
// const teamsfx = new TeamsFx(IdentityType.App, {
//   initiateLoginEndpoint: process.env.REACT_APP_START_LOGIN_PAGE_URL,
//   clientId: process.env.REACT_APP_CLIENT_ID,
// });
const teamsfx = new TeamsFx(IdentityType.App);
const graphClient = createMicrosoftGraphClient(teamsfx);
const profile = await graphClient.api("/users/{object_id_of_another_people}").get(); // Get the profile of certain user
```

## Core Concepts & Code Structure

### TeamsFx class
`TeamsFx` class instance reads all TeamsFx settings from environment variables by default. You can also set customized configuration values to override the default values. Please check [Override configuration](#override-configuration) for details.

When creating a TeamsFx instance, you also need to specify the identity type. There are 2 identity types:

#### User Identity
Using `new TeamsFx(IdentityType.User)` means the application will be authenticated as current Teams user. This one is the default choice. You need to call `TeamsFx:setSsoToken()` when you use user identity in NodeJS environment(without browser).

You can use `TeamsFx:getUserInfo()` to get user's basic information.
`TeamsFx:login()` is used to let user perform consent process if you want to use SSO to get access token for certain OAuth scopes.

#### Application Identity
Using `new TeamsFx(IdentityType.App)` means the application will be authenticated as an application. The permission usually need administrator's approval.

`TeamsFx:getCredential()` provides credential instances automatically corresponding to identity type:
- User Identity: It means that you can access resources on behalf of current Teams user.
- App Identity: It means that you are acting as a managed app identity which usually need admin consent for resources.

### Credential

//Developers should choose identity type when initializing TeamsFx. SDK provides 2 types: User and App.
After developer has specified the identity type when initializing TeamsFx, SDK uses different kinds of credential class to represent the identity and get access token by corresponding auth flow.

There are 3 credential classes that are used to help simplifying authentication. They are located under [credential](src/credential) folder.
Credential classes implements `TokenCredential` interface that is broadly used in Azure library APIs. They are designed to provide access token for specific scopes. Other APIs that relies on credential call `TeamsFx:getCredential()` to get an instance of `TokenCredential`.

Here's the corresponding scenarios that each credential class targets.

#### User Identity in browser environment
`TeamsUserCredential` represents Teams current user's identity. Using this credential will request user consent at the first time. It leverages the Teams SSO and On-Behalf-Of flow to do token exchange. SDK uses this credential when developer choose "User" identity in browser environment.

Required configuration: initiateLoginEndpoint, clientId.

#### User Identity in NodeJS environment
`OnBehalfOfUserCredential` uses On-Behalf-Of flow and need Teams ssoToken. It's designed to be used in Azure Function or Bot scenarios. SDK uses this credential when developer choose "User" identity in NodeJS environment.

Required configuration: authorityHost, tenantId, clientId, clientSecret / certificateContent.

#### Application Identity in NodeJS environment
`AppCredential` represents the application identity. It is usually used when user is not involved like time-triggered automation job. SDK uses this credential when developer choose "App" identity in NodeJS environment.

Required configuration: tenantId, clientId, clientSecret / certificateContent.

### Bot SSO

Bot related classes are stored under [bot](src/bot) folder.

`TeamsBotSsoPrompt` has a good integration with Bot framework. It simplifies the authentication process when you develops bot application and want to leverage the Bot SSO.

Required configuration: initiateLoginEndpoint, tenantId, clientId, applicationIdUri.

### Helper Function

TeamsFx SDK provides several helper functions to ease the configuration for third-party libraries. They are located under [core](src/core) folder.

#### Microsoft Graph Service
`createMicrosoftGraphClient` and `MsGraphAuthProvider` help to create authenticated Graph instance.

#### SQL
`getTediousConnectionConfig` returns a tedious connection config.

Required configuration:
- sqlServerEndpoint, sqlUsername, sqlPassword if you want to use user identity
- sqlServerEndpoint, sqlIdentityId if you want to use MSI identity

### Error Handling

API will throw `ErrorWithCode` if error happens. Each `ErrorWithCode` contains error code and error message.

For example, to filter out specific error, you could use the following check:

```ts
try {
  const teamsfx = new TeamsFx();
  await teamsfx.login("User.Read");
} catch (err: unknown) {
  if (err instanceof ErrorWithCode && err.code !== ErrorCode.ConsentFailed) {
    throw err;
  } else {
    // Silently fail because user cancels the consent dialog
    return;
  }
}
```

And if credential instance is used in other library like Microsoft Graph, it's possible that error is catched and transformed.

```ts
try {
  const teamsfx = new TeamsFx();
  const graphClient = createMicrosoftGraphClient(teamsfx, ["User.Read"]); // Initializes MS Graph SDK using our MsGraphAuthProvider
  const profile = await graphClient.api("/me").get();
} catch (err: unknown) {
  // ErrorWithCode is handled by Graph client
  if (err instanceof GraphError && err.code?.includes(ErrorCode.UiRequiredError)) {
    this.setState({
      showLoginBtn: true,
    });
  }
}
```

## Examples

The following sections provide several code snippets covering some of the most common scenarios, including:

- [Use Graph API in tab app](#use-graph-api-in-tab-app)
- [Call Azure Function in tab app](#call-azure-function-in-tab-app)
- [Access SQL database in Azure Function](#access-sql-database-in-azure-function)
- [Use certificate-based authentication in Azure Function](#use-certificate-based-authentication-in-azure-function)
- [Use Graph API in Bot application](#use-graph-api-in-bot-application)

### Use Graph API in tab app

Use `TeamsFx` and `createMicrosoftGraphClient`.

```ts
const teamsfx = new TeamsFx();
const graphClient = createMicrosoftGraphClient(teamsfx, ["User.Read"]);
const profile = await graphClient.api("/me").get();
```

### Call Azure Function in tab app

Use `axios` library to make HTTP request to Azure Function.

```ts
const teamsfx = new TeamsFx();
const credential = teamsfx.getCredential();
// Create an API client that uses SSO token to authenticate requests
const apiClient = createApiClient(
  teamsfx.getConfig("apiEndpoint"),
  new BearerTokenAuthProvider(async ()=> (await credential.getToken(""))!.token));
// Call API hosted in Azure Functions on behalf of user
const response = await apiClient.get("/api/" + functionName);
```

### Access SQL database in Azure Function

Use `tedious` library to access SQL and leverage `DefaultTediousConnectionConfiguration` that manages authentication.
Apart from `tedious`, you can also compose connection config of other SQL libraries based on the result of `sqlConnectionConfig.getConfig()`.

```ts
// Equivalent to:
// const sqlConnectConfig = new DefaultTediousConnectionConfiguration({
//    sqlServerEndpoint: process.env.SQL_ENDPOINT,
//    sqlUsername: process.env.SQL_USER_NAME,
//    sqlPassword: process.env.SQL_PASSWORD,
// });
const teamsfx = new TeamsFx();
// if there's only one SQL database
const config = await getTediousConnectionConfig(teamsfx);
// if there are multiple SQL databases
const config2 = await getTediousConnectionConfig(teamsfx, "your database name");
const connection = new Connection(config);
connection.on("connect", (error) => {
  if (error) {
    console.log(error);
  }
});
```

### Use certificate-based authentication in Azure Function

```ts
const teamsfx = new TeamsFx(IdentityType.App, {
  certificateContent: "The content of a PEM-encoded public/private key certificate"
});
const token = teamsfx.getCredential().getToken();
```

### Use Graph API in Bot application

Add `TeamsBotSsoPrompt` to dialog set.

```ts
const { ConversationState, MemoryStorage } = require("botbuilder");
const { DialogSet, WaterfallDialog } = require("botbuilder-dialogs");
const { TeamsBotSsoPrompt } = require("@microsoft/teamsfx");

const convoState = new ConversationState(new MemoryStorage());
const dialogState = convoState.createProperty("dialogState");
const dialogs = new DialogSet(dialogState);

const teamsfx = new TeamsFx();
dialogs.add(
  new TeamsBotSsoPrompt(teamsfx, "TeamsBotSsoPrompt", {
    scopes: ["User.Read"],
  })
);

dialogs.add(
  new WaterfallDialog("taskNeedingLogin", [
    async (step) => {
      return await step.beginDialog("TeamsBotSsoPrompt");
    },
    async (step) => {
      const token = step.result;
      if (token) {
        // ... continue with task needing access token ...
      } else {
        await step.context.sendActivity(`Sorry... We couldn't log you in. Try again later.`);
        return await step.endDialog();
      }
    },
  ])
);
```

### Create API client to call existing API in Bot / Azure Function

```ts
const teamsfx = new TeamsFx();

// Create an API Key auth provider. Following auth providers are also available:
// BearerTokenAuthProvider, BasicAuthProvider, CertificateAuthProvider
const authProvider = new ApiKeyProvider("your_api_key_name", 
  teamsfx.getConfig("YOUR_API_KEY_VALUE"), // This reads the value of YOUR_API_KEY_VALUE environment variable
  ApiKeyLocation.Header);

// Create an API client using above auth provider
// You can also implement AuthProvider interface and use it here
const apiClient = createApiClient(
  teamsfx.getConfig("YOUR_API_ENDPOINT"), // This reads YOUR_API_ENDPOINT environment variable
  authProvider);

// Send a GET request to "relative_api_path"
const response = await apiClient.get("relative_api_path");
```

## Advanced Customization

### Configure log

You can set custome log level and redirect outputs when using this library.
Logging is turned off by default, you can turn it on by setting log level.

#### Enable log by setting log level

When log level is set, logging is enabled. It prints log information to console by default.

Set log level using the snippet below:

```ts
// Only need the warning and error messages.
setLogLevel(LogLevel.Warn);
```

You can redirect log output by setting custom logger or log function.

##### Redirect by setting custom logger

```ts
setLogLevel(LogLevel.Info);
// Set another logger if you want to redirect to Application Insights in Azure Function
setLogger(context.log);
```

##### Redirect by setting custom log function

Please note that log function will not take effect if you set a custom logger.

```ts
setLogLevel(LogLevel.Info);
// Only log error message to Application Insights in bot application.
setLogFunction((level: LogLevel, message: string) => {
  if (level === LogLevel.Error) {
    this.telemetryClient.trackTrace({
      message: message,
      severityLevel: Severity.Error,
    });
  }
});
```


### Override configuration
You can pass custom config when creating `TeamsFx` instance to override default configuration or set required fields when environment variables are missing.

- If you have created tab project using VS Code toolkit, the following config values will be used from pre-configured environment variables:
  * authorityHost (REACT_APP_AUTHORITY_HOST)
  * tenantId (REACT_APP_TENANT_ID)
  * clientId (REACT_APP_CLIENT_ID)
  * initiateLoginEndpoint (REACT_APP_START_LOGIN_PAGE_URL)
  * applicationIdUri (REACT_APP_START_LOGIN_PAGE_URL)
  * apiEndpoint (REACT_APP_FUNC_ENDPOINT)
  * apiName (REACT_APP_FUNC_NAME)

- If you have created Azure Function / Bot project using VS Code toolkit, the following config values will be used from pre-configured environment variables:
  * initiateLoginEndpoint (INITIATE_LOGIN_ENDPOINT)
  * authorityHost (M365_AUTHORITY_HOST)
  * tenantId (M365_TENANT_ID)
  * clientId (M365_CLIENT_ID)
  * clientSecret (M365_CLIENT_SECRET)
  * applicationIdUri (M365_APPLICATION_ID_URI)
  * apiEndpoint (API_ENDPOINT)
  * sqlServerEndpoint (SQL_ENDPOINT)
  * sqlUsername (SQL_USER_NAME)
  * sqlPassword (SQL_PASSWORD)
  * sqlDatabaseName (SQL_DATABASE_NAME)
  * sqlIdentityId (IDENTITY_ID)

## How to fix the breaking change if upgraded from previous SDK version

If you are using the version of SDK that has `loadConfiguration()`, you can follow these steps to upgrade to the latest SDK version.
1. Remove `loadConfiguration()` and pass customized settings using `new TeamsFx(IdentityType.User, { ...customConfig })`.
2. Replace `new TeamsUserCredential()` with `new TeamsFx()`.
3. Replace `new M365TenantCredential()` with `new TeamsFx(IdentityType.App)`.
4. Replace `new OnBehalfOfUserCredential(ssoToken)` with `new TeamsFx().setSsoToken(ssoToken)`.
5. Pass the instance of `TeamsFx` to helper functions to replace credential instance.

Also see [TeamsFx class](#teamsfx-class) for furthur description.

## Next steps

Please take a look at the [Samples](https://github.com/OfficeDev/TeamsFx-Samples) project for detailed examples on how to use this library.

## Related projects

- [Microsoft Teams Toolkit for Visual Studio Code](https://github.com/OfficeDev/TeamsFx/tree/main/packages/vscode-extension)
- [TeamsFx Cli](https://github.com/OfficeDev/TeamsFx/tree/main/packages/cli)

## Data Collection.

The software may collect information about you and your use of the software and send it to Microsoft. Microsoft may use this information to provide services and improve our products and services. You may turn off the telemetry as described in the repository. There are also some features in the software that may enable you and Microsoft to collect data from users of your applications. If you use these features, you must comply with applicable law, including providing appropriate notices to users of your applications together with a copy of Microsoft's privacy statement. Our privacy statement is located at https://go.microsoft.com/fwlink/?LinkID=824704. You can learn more about data collection and use in the help documentation and our privacy statement. Your use of the software operates as your consent to these practices.

## Code of Conduct

This project has adopted the [Microsoft Open Source Code of Conduct](https://opensource.microsoft.com/codeofconduct/). For more information see the [Code of Conduct FAQ](https://opensource.microsoft.com/codeofconduct/faq/) or contact [opencode@microsoft.com](mailto:opencode@microsoft.com) with any additional questions or comments.

## Contributing

There are many ways in which you can participate in the project, for example:

- [Submit bugs and feature requests](https://github.com/OfficeDev/TeamsFx/issues), and help us verify as they are checked in
- Review [source code changes](https://github.com/OfficeDev/TeamsFx/pulls)

If you are interested in fixing issues and contributing directly to the code base, please see the [Contributing Guide](./CONTRIBUTING.md).

## Reporting Security Issues

**Please do not report security vulnerabilities through public GitHub issues.**

Instead, please report them to the Microsoft Security Response Center (MSRC) at [https://msrc.microsoft.com/create-report](https://msrc.microsoft.com/create-report).

If you prefer to submit without logging in, send email to [secure@microsoft.com](mailto:secure@microsoft.com). If possible, encrypt your message with our PGP key; please download it from the the [Microsoft Security Response Center PGP Key page](https://www.microsoft.com/en-us/msrc/pgp-key-msrc).

You should receive a response within 24 hours. If for some reason you do not, please follow up via email to ensure we received your original message. Additional information can be found at [microsoft.com/msrc](https://www.microsoft.com/msrc).

## Trademarks

This project may contain trademarks or logos for projects, products, or services. Authorized use of Microsoft trademarks or logos is subject to and must follow [Microsoft's Trademark & Brand Guidelines](https://www.microsoft.com/en-us/legal/intellectualproperty/trademarks/usage/general). Use of Microsoft trademarks or logos in modified versions of this project must not cause confusion or imply Microsoft sponsorship. Any use of third-party trademarks or logos are subject to those third-party's policies.

## License

Copyright (c) Microsoft Corporation. All rights reserved.

Licensed under the [MIT](LICENSE.txt) license.
