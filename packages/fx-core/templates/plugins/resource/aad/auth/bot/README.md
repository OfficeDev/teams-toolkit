## How to enable SSO in TeamsFx Bot projects

This doc will show you how to add Single sign-on (SSO) feature to TeamsFx Bot projects. Note that this article is only for Teams Toolkit Visual Studio Code Extension version after x.x.x or TeamsFx CLI version after x.x.x.

*Note: This article is only for bot hosted on Azure App Service. Bot that hosted on Azure Function is not supported now.*

*Note: This article is only for TeamsFx projects by Javascript and Typescript. For Dotnet, please refer to ${help link}.*

For more detail about SSO, please refer to the [wiki](https://aka.ms/teamsfx-add-sso-readme).

### What we have done in 'Add SSO' command

By triggering `Add SSO` command, we will help you to setup your project to enable SSO and create `auth/bot` folder with some code snippet. For detail, please refer to the [wiki](https://aka.ms/teamsfx-add-sso-readme).

### What you need to do after triggering 'Add SSO' command

Please follow the [wiki](https://aka.ms/teamsfx-add-sso-readme) to update your source code, provision Azure AD app and deploy latest code.