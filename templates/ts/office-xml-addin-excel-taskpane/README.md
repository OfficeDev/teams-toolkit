# Build Excel add-ins using Teams Toolkit

Excel add-ins are integrations built by third parties into Excel by using [Excel JavaScript API](https://learn.microsoft.com/en-us/office/dev/add-ins/reference/overview/excel-add-ins-reference-overview) and [Office Platform capabilities](https://learn.microsoft.com/en-us/office/dev/add-ins/overview/office-add-ins).

## Prerequisites

- Node.js 16 or 18 (18 is preferred). Visit the  website to download and install the right version for your operating system.
- Office connected to a Microsoft 365 subscription (including Office on the web). If you don't already have Office, you might qualify for a Microsoft 365 E5 developer subscription through the [Microsoft 365 Developer Program](https://developer.microsoft.com/en-us/microsoft-365/dev-program); for details, see the [FAQ](https://learn.microsoft.com/en-us/office/developer-program/microsoft-365-developer-program-faq#who-qualifies-for-a-microsoft-365-e5-developer-subscription-). Alternatively, you can [sign up for a 1-month free trial](https://www.microsoft.com/en-us/microsoft-365/try?rtc=1) or [purchase a Microsoft 365 plan](https://www.microsoft.com/en-us/microsoft-365/buy/compare-all-microsoft-365-products).

## Run and Debug Excel Add-in

You can run and debug this project by either of the following ways:

- By hitting the `F5` key in Visual Studio Code.
- By clicking the *`Preview Your Add-in`* in Teams Toolkit extension side bar.
- By running with command `npm run start` in the terminal.


## Understand the project

The add-in project that you've created contains sample code for a basic task pane add-in. If you'd like to explore the components of your add-in project, open the project in your code editor and review the key files listed below. 

- The `./manifest.xml` file in the root directory of the project defines the settings and capabilities of the add-in.
- The `./src/taskpane/taskpane.html` file contains the HTML markup for the task pane.
- The `./src/taskpane/taskpane.css` file contains the CSS that's applied to content in the task pane.
- The `./src/taskpane/taskpane.ts` file contains the Office JavaScript API code that facilitates interaction between the task pane and the Excel application.


## Edit the manifest

You can edit the manifest file by either of the following ways:

- From Visual Studio Code: open Teams Toolkit extension side bar and click *`Edit Manifest`*.
- Directly edit and modify the content in `./manifest.xml`.


## Validate manifest

You can check whether your manifest file is valid by either of the following ways:

- From Visual Studio Code: open Teams Toolkit extension side bar and click *`Validate Manifest`*.
- From Terminal: run the command `npx --yes office-addin-manifest validate manifest.xml`