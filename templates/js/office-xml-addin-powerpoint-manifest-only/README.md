# Build PowerPoint add-ins using Teams Toolkit

PowerPoint add-ins are integrations built by third parties into PowerPoint by using [PowerPoint JavaScript API](https://learn.microsoft.com/en-us/office/dev/add-ins/reference/overview/powerpoint-add-ins-reference-overview) and [Office Platform capabilities](https://learn.microsoft.com/en-us/office/dev/add-ins/overview/office-add-ins).

## Prerequisites

- Node.js 16 or 18 (18 is preferred). Visit the  website to download and install the right version for your operating system.
- Office connected to a Microsoft 365 subscription (including Office on the web). If you don't already have Office, you might qualify for a Microsoft 365 E5 developer subscription through the [Microsoft 365 Developer Program](https://developer.microsoft.com/en-us/microsoft-365/dev-program); for details, see the [FAQ](https://learn.microsoft.com/en-us/office/developer-program/microsoft-365-developer-program-faq#who-qualifies-for-a-microsoft-365-e5-developer-subscription-). Alternatively, you can [sign up for a 1-month free trial](https://www.microsoft.com/en-us/microsoft-365/try?rtc=1) or [purchase a Microsoft 365 plan](https://www.microsoft.com/en-us/microsoft-365/buy/compare-all-microsoft-365-products).

## Understand the project

The add-in project that you've created contains sample code for a basic task pane add-in. If you'd like to explore the components of your add-in project, open the project in your code editor and review the key files listed below. 

- The `./manifest.xml` file in the root directory of the project defines the settings and capabilities of the add-in.

## Validate manifest

You can check whether your manifest file is valid by either of the following ways:

- From Visual Studio Code: open Teams Toolkit extension sidebar and click *`Validate Manifest`*.
- From Terminal: run the command `npx --yes office-addin-manifest validate manifest.xml`