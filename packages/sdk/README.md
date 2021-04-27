# TeamsFx SDK for TypeScript/JavaScript

TeamsFx aims to reduce the developer tasks of implementing identity and access to cloud resources down to single-line statements with "zero configuration".

Use the library to:

- Access core functionalities in client and server environment in a similar way.
- Write user authentication code in a simplified way.

[Source code](https://github.com/OfficeDev/TeamsFx/tree/main/packages/sdk) |
[Package (NPM)](https://www.npmjs.com/package/@microsoft/teamsfx) |
[API reference documentation](https://aka.ms/teamsfx-sdk-help) |
[Product documentation]() |
[Samples](https://github.com/OfficeDev/TeamsFx-Samples)

## Getting started

TeamsFx SDK is pre-configured in scaffolded project using TeamsFx toolkit or cli.
Please check the [wiki page]() to see how to create a Teams App project.

### Currently supported environments

- Node.js version 10.x.x or higher

### Prerequisites

- A project created by TeamsFx toolkit VS Code extension or Cli tool.
- If your project has installed `botbuilder-core` and `botbuilder-dialogs` packages as dependencies, ensure they have version `>= 4.9.3`.

### Install the `@microsoft/teamsfx` package

Install the TeamsFx SDK for TypeScript/JavaScript with `npm`:

```bash
npm install @microsoft/teamsfx
```

### Create and authenticate a `MicrosoftGraphClient`

To create a graph client object to access the Microsoft Graph API, you will need the credential to do authentication. The SDK provides several credential classes to choose that meets various requirements.

#### Using Teams App User Credential

Use the snippet below:

**Note:** You can only use this credential class in browser application like Teams Tab App.

```ts
const credential = new TeamsUserCredential();
const graphClient = createMicrosoftGraphClient(credential, ["User.Read"]); // Initializes MS Graph SDK using our MsGraphAuthProvider
const profile = await graphClient.api("/me").get();
```

#### Using Microsoft 365 Tenant Credential

It doesn't require the interaction with Teams App user. You can call Microsoft Graph as application.
Use the snippet below:

```ts
const credential = new M365TenantCredential();
const graphClient = createMicrosoftGraphClient(credential);
const profile = await graphClient.api("/users/{object_id_of_another_people}").get();
```

## Core Concepts & Code Structure

### Credential

There are 3 credential classes that are used to help simplifying authentication. They are located under [credential](src/credential) folder.
Credential classes implements `TokenCredential` interface that is broadly used in Azure library APIs. They are designed to provide access token for specific scopes.
The credential classes represents different identity under certain scenarios.

`TeamsUserCredential` represents Teams current user's identity. Using this credential will request user consent at the first time.
`M365TenantCredential` represents Microsoft 365 tenant identity. It is usually used when user is not involved like time-triggered automation job.
`OnBehalfOfUserCredential` uses on-behalf-of flow. It needs an access token and you can get a new token for different scope. It's designed to be used in Azure Function or Bot scenarios.

### Bot

Bot related classes are stored under [bot](src/bot) folder.

`TeamsBotSsoPrompt` has a good integration with Bot framework. It simplifies the authentication process when you develops bot application.

### Helper Function

TeamsFx SDK provides helper functions to ease the configuration for third-party libraries. They are located under [core](src/core) folder.

### Error Handling

API will throw `ErrorWithCode` if error happens. Each `ErrorWithCode` contains error code and error message.

For example, to filter out all errors, you could use the following check:

```ts
try {
  const credential = new TeamsUserCredential();
  const graphClient = createMicrosoftGraphClient(credential, ["User.Read"]); // Initializes MS Graph SDK using our MsGraphAuthProvider
  const profile = await graphClient.api("/me").get();
} catch (err) {
  // Show login button when specific ErrorWithCode is caught.
  if (err instanceof ErrorWithCode && err.code === ErrorCode.UiRequiredError) {
    this.setState({
      showLoginBtn: true
    });
  }
}
```

## Examples

The following sections provide several code snippets covering some of the most common scenarios, including:

- [Use Graph API in tab app](#user-graph-api-in-tab-app)
- [Call Azure Function in tab app](#call-azure-function-in-tap-app)
- [Access SQL database in Azure Function](#access-sql-database-in-azure-function)
- [Use Graph API in Bot application](#use-graph-api-in-bot-application)

### Use Graph API in tab app

Use `TeamsUserCredential` and `createMicrosoftGraphClient`.

```ts
loadConfiguration({
  authentication: {
    initiateLoginEndpoint: process.env.REACT_APP_START_LOGIN_PAGE_URL,
    simpleAuthEndpoint: process.env.REACT_APP_TEAMSFX_ENDPOINT,
    clientId: process.env.REACT_APP_CLIENT_ID
  }
});
const credential: any = new TeamsUserCredential();
const graphClient = createMicrosoftGraphClient(credential, ["User.Read"]);
const profile = await graphClient.api("/me").get();
```

### Call Azure Function in tab app

Use `axios` library to make HTTP request to Azure Function.

```ts
loadConfiguration({
  authentication: {
    initiateLoginEndpoint: process.env.REACT_APP_START_LOGIN_PAGE_URL,
    simpleAuthEndpoint: process.env.REACT_APP_TEAMSFX_ENDPOINT,
    clientId: process.env.REACT_APP_CLIENT_ID
  }
});
const credential: any = new TeamsUserCredential();
const token = credential.getToken(""); // Get SSO token for the user
// Call API hosted in Azure Functions on behalf of user
const apiConfig = getResourceConfiguration(ResourceType.API);
const response = await axios.default.get(apiConfig.endpoint + "api/httptrigger1", {
  headers: {
    authorization: "Bearer " + token
  }
});
```

### Access SQL database in Azure Function

Use `tedious` library to access SQL and leverage `DefaultTediousConnectionConfiguration` that manages authentication.
Apart from `tedious`, you can also compose connection config of other SQL libraries based on the result of `sqlConnectionConfig.getConfig()`.

```ts
loadConfiguration();
const sqlConnectConfig = new DefaultTediousConnectionConfiguration();
const config = await sqlConnectConfig.getConfig();
const connection = new Connection(config);
connection.on("connect", (error) => {
  if (error) {
    console.log(error);
  }
});
```

### Use Graph API in Bot application

Add `TeamsBotSsoPrompt` to dialog set.

```ts
// Create a DialogState property, DialogSet and TeamsBotSsoPrompt
const dialogState: StatePropertyAccessor<DialogState> = convoState.createProperty("dialogState");
const dialogs: DialogSet = new DialogSet(dialogState);
const settings: TeamsBotSsoPromptSettings = {
  scopes: ["User.Read"]
};

loadConfiguration(config);

dialogs.add(new TeamsBotSsoPrompt("TEAMS_BOT_SSO_PROMPT", settings));
```

## Troubleshooting

### Configure log

You can set custome log level and logger when using this library.
The default log level is `info` and SDK will print log information to console.

Set log level using the snippet below:

```ts
// Only need the warning and error messages.
setLogLevel(LogLevel.Warn);
```

Set a custome log function if you want to redirect output:

```ts
// Only log error message to Application Insights in bot application.
setLogFunction((level: LogLevel, ...args: any[]) => {
  if (level === LogLevel.Error) {
    const { format, ...rest } = args;
    this.telemetryClient.trackTrace({
      message: util.format(format, ...rest),
      severityLevel: Severity.Error
    });
  }
});
```

Set a custome logger instance:

```ts
// context.log send messages to Application Insights in Azure Function
setLogger(context.log);
```

## Next steps

Please take a look at the [Samples](https://github.com/OfficeDev/TeamsFx-Samples) project for detailed examples on how to use this library.

## Contributing

This project welcomes contributions and suggestions. Most contributions require you to agree to a
Contributor License Agreement (CLA) declaring that you have the right to, and actually do, grant us
the rights to use your contribution. For details, visit https://cla.microsoft.com.

When you submit a pull request, a CLA-bot will automatically determine whether you need to provide
a CLA and decorate the PR appropriately (e.g., label, comment). Simply follow the instructions
provided by the bot. You will only need to do this once across all repos using our CLA.

This project has adopted the [Microsoft Open Source Code of Conduct](https://opensource.microsoft.com/codeofconduct/).
For more information see the [Code of Conduct FAQ](https://opensource.microsoft.com/codeofconduct/faq/) or
contact [opencode@microsoft.com](mailto:opencode@microsoft.com) with any additional questions or comments.

If you'd like to contribute to this library, please read the [contribution guide](CONTRIBUTING.md) to learn more about how to build and test the code.

## Reporting security issues and bugs

Security issues and bugs should be reported privately, via email, to the Microsoft Security Response Center (MSRC) secure@microsoft.com. You should receive a response within 24 hours. If for some reason you do not, please follow up via email to ensure we received your original message. Further information, including the MSRC PGP key, can be found in the [Security TechCenter](https://technet.microsoft.com/en-us/security/ff852094.aspx).

## Related projects

- [Microsoft Teams Toolkit for Visual Studio Code](https://github.com/OfficeDev/TeamsFx/tree/main/packages/vscode-extension)
- [TeamsFx Cli](https://github.com/OfficeDev/TeamsFx/tree/main/packages/cli)
