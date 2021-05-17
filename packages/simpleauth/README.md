# Simple Auth
## Introduction
The Simple Auth is a backend service helping Teams tab app access first/third party services from client side.

## Getting Started

1. Create and config an AAD application according to Teams tab app single sign-on [document](https://docs.microsoft.com/en-us/microsoftteams/platform/tabs/how-to/authentication/auth-aad-sso)
2. Open appsettings.json located at `./src/TeamsFxSimpleAuth/appsettings.json` and update following configurations

    | Configuration Name | Required | Expected Value | Purpose |
    | ------------------ | -------- | -------------- | ------- |
    | CLIENT_ID | Yes | Client id of AAD application created in step 1 | Used to acquire token for expect scope. Also used as valid audience when validating token in requests to this API. |
    | CLIENT_SECRET | Yes | Client secret of AAD application created in step 1 | Used to acquire token for expect scope |
    | IDENTIFIER_URI | Yes | Application ID URI of AAD application created in step 1 | Used as valid audience when validating token in requests to this API. |
    | OAUTH_AUTHORITY | Yes | https://login.microsoftonline.com/{aad-tenant-id} | AAD token endpoint to acquire tokens |
    | AAD_METADATA_ADDRESS | Yes | https://login.microsoftonline.com/{aad-tenant-id}/v2.0/.well-known/openid-configuration | Metadata document used during token validation. |
    | ALLOWED_APP_IDS | Yes | 1fec8e78-bce4-4aaf-ab1b-5451cc387264;5e3ce6c0-2b1f-4285-8d4b-75ee78787346 | these two constant ids defines tokens from teams clients can access this API. |
    | TAB_APP_ENDPOINT | Yes | https://{TabAppDomain} | Cross-origin resource sharing (CORS)  allows Simple Auth API to be requested from your tab app server, such as "https://localhost:3000" if you run tab app locally |
3. Set `TeamsFxSimpleAuth` as startup project in Visual Studio, and press F5 to start the API.

## Deployment
This is a general ASP.NET Core 3.1 project, you can choose your favorite hosting solution for it. Follow the configuration steps in getting started section to set the configurations properly.


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

