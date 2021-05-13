# TeamsFx SDK for TypeScript/JavaScript

TeamsFx aims to reduce the developer tasks of implementing identity and access to cloud resources down to single-line statements with "zero configuration".

Use the library to:

- Access core functionalities in client and server environment in a similar way.
- Write user authentication code in a simplified way.

[Source code](https://github.com/OfficeDev/TeamsFx/tree/main/packages/sdk) |
[Package (NPM)](https://www.npmjs.com/package/@microsoft/teamsfx) |
[API reference documentation](https://aka.ms/teamsfx-sdk-help) |
[Samples](https://github.com/OfficeDev/TeamsFx-Samples)

## Getting started

TeamsFx SDK is pre-configured in scaffolded project using TeamsFx toolkit or cli.
Please check the [README](https://github.com/OfficeDev/TeamsFx/blob/main/packages/vscode-extension/README.md) to see how to create a Teams App project.

### Prerequisites

- Node.js version 10.x.x or higher
- A project created by TeamsFx toolkit VS Code extension or Cli tool.
- If your project has installed `botbuilder` related [packages](https://github.com/Microsoft/botbuilder-js#packages) as dependencies, ensure they are of the same version and the version `>= 4.9.3`. ([Issue - all of the BOTBUILDER packages should be the same version](https://github.com/BotBuilderCommunity/botbuilder-community-js/issues/57#issuecomment-508538548))

### Install the `@microsoft/teamsfx` package

Install the TeamsFx SDK for TypeScript/JavaScript with `npm`:

```bash
npm install @microsoft/teamsfx
```

### Create and authenticate a `MicrosoftGraphClient`

To create a graph client object to access the Microsoft Graph API, you will need the credential to do authentication. The SDK provides several credential classes to choose that meets various requirements.

Please note that you need to load configuration before using any credentials.

- In browser environment, you need to explicitly pass in the config parameters. The scaffolded React project has provided environment variables to use.

```ts
loadConfiguration({
  authentication: {
    initiateLoginEndpoint: process.env.REACT_APP_START_LOGIN_PAGE_URL,
    simpleAuthEndpoint: process.env.REACT_APP_TEAMSFX_ENDPOINT,
    clientId: process.env.REACT_APP_CLIENT_ID,
  },
});
```

- In NodeJS environment like Azure Function, you can just call `loadConfiguration`. It will load from environment variables by default.

```ts
loadConfiguration();
```

#### Using Teams App User Credential

Use the snippet below:

**Note:** You can only use this credential class in browser application like Teams Tab App.

```ts
loadConfiguration({
  authentication: {
    initiateLoginEndpoint: process.env.REACT_APP_START_LOGIN_PAGE_URL,
    simpleAuthEndpoint: process.env.REACT_APP_TEAMSFX_ENDPOINT,
    clientId: process.env.REACT_APP_CLIENT_ID,
  },
});
const credential = new TeamsUserCredential();
const graphClient = createMicrosoftGraphClient(credential, ["User.Read"]); // Initializes MS Graph SDK using our MsGraphAuthProvider
const profile = await graphClient.api("/me").get();
```

#### Using Microsoft 365 Tenant Credential

It doesn't require the interaction with Teams App user. You can call Microsoft Graph as application.
Use the snippet below:

```ts
loadConfiguration();
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
- [Use Graph API in Bot application](#use-graph-api-in-bot-application)

### Use Graph API in tab app

Use `TeamsUserCredential` and `createMicrosoftGraphClient`.

```ts
loadConfiguration({
  authentication: {
    initiateLoginEndpoint: process.env.REACT_APP_START_LOGIN_PAGE_URL,
    simpleAuthEndpoint: process.env.REACT_APP_TEAMSFX_ENDPOINT,
    clientId: process.env.REACT_APP_CLIENT_ID,
  },
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
    clientId: process.env.REACT_APP_CLIENT_ID,
  },
});
const credential: any = new TeamsUserCredential();
const token = credential.getToken(""); // Get SSO token for the user
// Call API hosted in Azure Functions on behalf of user
const apiConfig = getResourceConfiguration(ResourceType.API);
const response = await axios.default.get(apiConfig.endpoint + "api/httptrigger1", {
  headers: {
    authorization: "Bearer " + token,
  },
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
const { ConversationState, MemoryStorage } = require("botbuilder");
const { DialogSet, WaterfallDialog } = require("botbuilder-dialogs");
const { TeamsBotSsoPrompt } = require("@microsoft/teamsfx");

const convoState = new ConversationState(new MemoryStorage());
const dialogState = convoState.createProperty("dialogState");
const dialogs = new DialogSet(dialogState);

loadConfiguration();
dialogs.add(
  new TeamsBotSsoPrompt("TeamsBotSsoPrompt", {
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
      severityLevel: Severity.Error,
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
