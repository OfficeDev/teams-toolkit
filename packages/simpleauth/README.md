# Simple Auth
The Simple Auth is a backend service helping Teams tab app access first/third party services from client side.

## Getting Started

1. Create and config an AAD application according to Teams tab app single sign-on [document](https://docs.microsoft.com/en-us/microsoftteams/platform/tabs/how-to/authentication/auth-aad-sso)
2. Open appsettings.json located at `./src/TeamsFxSimpleAuth/appsettings.json` and update following configurations

    | Configuration Name | Required | Expected Value | Purpose |
    | ------------------ | -------- | -------------- | ------- |
    | CLIENT_ID | Yes | Client id of AAD application created in step 1 | Used to acquire token for expect scope. Also used as valid audience when validating token in requests to this API. |
    | CLIENT_SECRET | Yes | Client secret of AAD application created in step 1 | Used to acquire token for expect scope |
    | IDENTIFIER_URI | Yes | Application ID URI of AAD application created in step 1 | Used as valid audience when validating token in requests to this API. |
    | OAUTH_TOKEN_ENDPOINT | Yes | https://login.microsoftonline.com/{aad-tenant-id}/oauth2/v2.0/token | AAD token endpoint to acquire tokens |
    | AAD_METADATA_ADDRESS | Yes | https://login.microsoftonline.com/common/v2.0/.well-known/openid-configuration | Metadata document used during token validation |
    | ALLOWED_APP_IDS | Yes | 1fec8e78-bce4-4aaf-ab1b-5451cc387264;5e3ce6c0-2b1f-4285-8d4b-75ee78787346 | Access control list, which defines tokens from which clients can access this API. Must include Teams client ids in Teams development scenario |
3. Set `TeamsFxSimpleAuth` as startup project in Visual Studio, and press F5 to start the API.

## Deployment
This is a general ASP.NET Core 3.1 project, you can choose your favorite hosting solution for it. Follow the configuration steps in getting started section to set the configurations properly.

## Contributing

Please read our [CONTRIBUTING.md](CONTRIBUTING.md) which outlines all of our policies, procedures, and requirements for contributing to this project.

## Versioning and changelog

We use [SemVer](http://semver.org/) for versioning.
For changelog, please read our [CHANGELOG.md](CHANGELOG.md).
