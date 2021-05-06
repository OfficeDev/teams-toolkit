# SPFx(SharePoint Framework) APP

## Summary

Short summary on functionality and used technologies.

[picture of the solution in action, if possible]

## Used SharePoint Framework Version

![version](https://img.shields.io/badge/version-1.12.1-green.svg)

## Applies to

- [SharePoint Framework](https://aka.ms/spfx)
- [Microsoft 365 tenant](https://docs.microsoft.com/en-us/sharepoint/dev/spfx/set-up-your-developer-tenant)

> Get your own free development tenant by subscribing to [Microsoft 365 developer program](http://aka.ms/o365devprogram)

## Prerequisites

> Any special pre-requisites?

## Solution

Solution|Author(s)
--------|---------
folder name | Author details (name, company, twitter alias with link)

## Version history

Version|Date|Comments
-------|----|--------
1.1|March 10, 2021|Update comment
1.0|January 29, 2021|Initial release

## Disclaimer

**THIS CODE IS PROVIDED *AS IS* WITHOUT WARRANTY OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING ANY IMPLIED WARRANTIES OF FITNESS FOR A PARTICULAR PURPOSE, MERCHANTABILITY, OR NON-INFRINGEMENT.**

---

## Minimal Path to Awesome

1. <b>Install the latest version of [Node.js LTS 14.x]</b>(https://nodejs.org/en/download/releases/)(Note: SPFx v1.12.1 support Node.js v10/12/14)
2. You can either download [Visual Studio Code](https://code.visualstudio.com) and install Teams Toolkit V2 or download TeamsFx CLI.
3. Open the project with VSCode and in the Teams Toolkit V2 sidebar, click `Provision in the Cloud` under PROJECT.

    Or you can use TeamsFx CLI with running this cmd under your project path:
    `teamsfx provision`

    It will provision an app in Teams App Studio. You may need to login with your M365 tenant admin account.

4. Build your SharePoint Package. 
    - Open one terminal and cd to SPFx under your project path.
    - Run cmd: npm install
    - Run cmd: ./node_modules/.bin/gulp.cmd bundle --ship
    - Run cmd: ./node_modules/.bin/gulp.cmd package-solution --ship
    - And you will find you SharePoint package(.sppkg) generated under sharepoint/solution folder. 
5. Deploy it to your SharePoint site, Pls refer to the instruction: [Deploy the HelloWorld package to app catalog](https://docs.microsoft.com/en-us/sharepoint/dev/spfx/web-parts/get-started/serve-your-web-part-in-a-sharepoint-page#deploy-the-helloworld-package-to-app-catalog)
6. Go back to Teams Toolkit V2, and in the sidebar, click `Publish to Teams`. 

    Or you can use TeamsFx CLI with running this cmd under your project path:
        `teamsfx publish`

You will find your app in [Microsoft Teams admin center](https://admin.teams.microsoft.com/policies/manage-apps). Enter your app name in the search box.
Click the item and select `Publish` in the Publishing status.
7. You may need to wait for a few minutes after publishing your teams app.And then login to Teams , and you will find your app in the `Apps - Built for {your-tenant-name}` catagory.

## Features

Description of the extension that expands upon high-level summary above.

This extension illustrates the following concepts:

- topic 1
- topic 2
- topic 3

> Notice that better pictures and documentation will increase the sample usage and the value you are providing for others. Thanks for your submissions advance.

> Share your web part with others through Microsoft 365 Patterns and Practices program to get visibility and exposure. More details on the community, open-source projects and other activities from http://aka.ms/m365pnp.

## References

- [Getting started with SharePoint Framework](https://docs.microsoft.com/en-us/sharepoint/dev/spfx/set-up-your-developer-tenant)
- [Building for Microsoft teams](https://docs.microsoft.com/en-us/sharepoint/dev/spfx/build-for-teams-overview)
- [Use Microsoft Graph in your solution](https://docs.microsoft.com/en-us/sharepoint/dev/spfx/web-parts/get-started/using-microsoft-graph-apis)
- [Publish SharePoint Framework applications to the Marketplace](https://docs.microsoft.com/en-us/sharepoint/dev/spfx/publish-to-marketplace-overview)
- [Microsoft 365 Patterns and Practices](https://aka.ms/m365pnp) - Guidance, tooling, samples and open-source controls for your Microsoft 365 development