# TeamsFx .NET SDK

A C# wrapper for Blazor projects to use the [TeamsFx SDK](https://github.com/OfficeDev/TeamsFx/tree/main/packages/sdk#teamsfx-sdk-for-typescriptjavascript) using [Blazor JavaScript interoperability](https://docs.microsoft.com/en-us/aspnet/core/blazor/javascript-interoperability).

[TeamsFx SDK for JavaScript/TypeScript](https://github.com/OfficeDev/TeamsFx/tree/main/packages/sdk) |
[API reference documentation](https://aka.ms/teamsfx-sdk-help)

## Getting started

Build Teams apps with Blazor and the TeamsFx .NET SDK using Teams Toolkit. [Visit the documentation to learn more](https://docs.microsoft.com/en-us/microsoftteams/platform/toolkit/visual-studio-overview).

### Prerequisites

1. Install the `ASP.NET and web development` workload using the Visual Studio Installer.
2. Launch Visual Studio and create a new Blazor project.

## Usage

### How to get the package

1. Right-click on the project in Visual Studio and choose Manage NuGet Packages.
2. Search for `Microsoft.TeamsFx` and add it to the Blazor project.

Alternately, you can use the Package Manager.

```ps
> Install-Package Microsoft.TeamsFx
```

### Using Teams User Credential in Teams Tab app

1. Add `TeamsFx` and `TeamsUserCredential` to services during startup.
```csharp
public void ConfigureServices(IServiceCollection services)
{
    ...
    services.AddScoped<TeamsFx>();
    services.AddScoped<TeamsUserCredential>();
}
```
2. Add the required namespaces to the `_Imports.razor` file.
```csharp
@using Microsoft.TeamsFx
@using Microsoft.TeamsFx.Model
```
3. Inject the registered TeamsFx services for any page that needs them.
```csharp
@inject TeamsFx teamsfx
@inject TeamsUserCredential teamsUserCredential
```
4. `TeamsFx.LoadConfigurationAsync()` should be called to initialize the library. A common place to call this code is in `OnAfterRenderAsync` of a Blazor component or page when `firstRender` is `true`.
```csharp
AuthenticationConfiguration authentication = 
    new AuthenticationConfiguration(clientId: _clientId, simpleAuthEndpoint: _endpoint, initiateLoginEndpoint: _endpoint + "auth-start.html");
Configuration configuration = new Configuration(authentication);
await teamsfx.LoadConfigurationAsync(configuration);
```
5. Call `TeamsUserCredential.GetTokenAsync()` to get token or pass it to other functions.
```csharp
try
{
    await teamsUserCredential.GetTokenAsync(
        new TokenRequestContext(new string[] { "User.Read" }),
        new System.Threading.CancellationToken());
}
catch (ExceptionWithCode e)
{
    if (e.Code == ExceptionCode.UiRequiredError)
    {
        // show login button to let user consent
    }
    else
    {
        throw;
    }
}
```

### Enabling Logging by Setting Log Level
Logging is turned off by default. Turn it on by the setting log level. It prints log information to console by default.

```csharp
// Only warning and error messages.
await teamsfx.SetLogLevelAsync(LogLevel.Warn);
```

Redirect the log messages to custom outputs like server console using `SetLogLevelAsync`.
The messages can be found in Output panel from "{AppName} - ASP.NET Core Web Server".
```csharp
await teamsfx.SetLogFunctionAsync(log);
...
private void log(LogLevel level, string message)
{
    Console.WriteLine(message);
}
```

### Bot
Will be supported in the future.

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
