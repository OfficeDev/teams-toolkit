# SPFx(SharePoint Framework) APP

## Summary

The SharePoint Framework (SPFx) is a page and web part model that provides full support for client-side SharePoint development, easy integration with SharePoint data, and extending Microsoft Teams. This project applies SPFx to Teams personal tab and group tab support.

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

4. Build and Deploy your SharePoint Package.
    - Click `Deploy to the Cloud` in Teams Toolkit V2 sidebar, or run `Teams: Deploy to the Cloud` from command palette. This will generate a SharePoint package(*.sppkg) under sharepoint/solution folder.
  
    Or you can use TeamsFx CLI with running this cmd under your project path:
        `teamsfx deploy`

    - Upload or drag and drop the *.sppkg to the SharePoint App Catalog site, please follow the instruction: [Deploy the HelloWorld package to App Catalog](https://docs.microsoft.com/en-us/sharepoint/dev/spfx/web-parts/get-started/serve-your-web-part-in-a-sharepoint-page#deploy-the-helloworld-package-to-app-catalog)
5. Go back to Teams Toolkit V2, and in the sidebar, click `Publish to Teams`. 

    Or you can use TeamsFx CLI with running this cmd under your project path:
        `teamsfx publish`

    You will find your app in [Microsoft Teams admin center](https://admin.teams.microsoft.com/policies/manage-apps). Enter your app name in the search box. Click the item and select `Publish` in the Publishing status.

6. You may need to wait for a few minutes after publishing your teams app.And then login to Teams, and you will find your app in the `Apps - Built for {your-tenant-name}` category.

7. Click "Add" to use the app as a personal tab. Click "Add to a team" to use the app as a group tab.

## Debug

Start debugging the project by hitting the `F5` key in Visual Studio Code. Alternatively use the `Run and Debug Activity Panel` in Visual Studio Code and click the `Start Debugging` green arrow button.

## References

- [Getting started with SharePoint Framework](https://docs.microsoft.com/en-us/sharepoint/dev/spfx/set-up-your-developer-tenant)
- [Building for Microsoft teams](https://docs.microsoft.com/en-us/sharepoint/dev/spfx/build-for-teams-overview)
- [Use Microsoft Graph in your solution](https://docs.microsoft.com/en-us/sharepoint/dev/spfx/web-parts/get-started/using-microsoft-graph-apis)
- [Publish SharePoint Framework applications to the Marketplace](https://docs.microsoft.com/en-us/sharepoint/dev/spfx/publish-to-marketplace-overview)
- [Microsoft 365 Patterns and Practices](https://aka.ms/m365pnp) - Guidance, tooling, samples and open-source controls for your Microsoft 365 development
