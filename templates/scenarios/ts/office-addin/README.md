# Build Outlook add-ins using Teams Toolkit
Outlook add-ins are integrations built by third parties into Outlook by using our web-based platform.
Now you have the ability to create a single unit of distribution for all your Microsoft 365 extensions by using the same manifest format and schema, based on the current JSON-formatted Teams manifest.

## Prerequisites

- [NodeJS](https://nodejs.org/en/): version 16 or 18.
- Outlook Desktop on Windows and Edge installed for debugging Outlook add-in.
- An M365 account. If you do not have M365 account, apply one from [M365 developer program](https://developer.microsoft.com/en-us/microsoft-365/dev-program)
- [Teams Toolkit Visual Studio Code Extension](https://aka.ms/teams-toolkit) Pre-release version

## Debug Outlook add-in
- Please note that the same M365 account should be used both in Teams Toolkit and Outlook. 
- From Visual Studio Code: Start debugging the project by hitting the `F5` key in Visual Studio Code.

## Edit the manifest

You can find the app manifest in `./appPackage` folder. The folder contains one manifest file:
* `manifest.json`: Manifest file for Outlook add-in running locally or running remotely (After deployed to Azure).
You may add any extra properties or permissions you require to this file. See the [schema reference](https://raw.githubusercontent.com/OfficeDev/microsoft-teams-app-schema/preview/op/extensions/MicrosoftTeams.schema.json) for more information.

## Deploy to Azure

Deploy your project to Azure by following these steps:

| From Visual Studio Code                                                                                                                                                                                                                                                                                                                                                  | From TeamsFx CLI                                                                                                                                                                                                                    |
| :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| <ul><li>Open Teams Toolkit, and sign into Azure by clicking the `Sign in to Azure` under the `ACCOUNTS` section from sidebar.</li> <li>After you signed in, select a subscription under your account.</li><li>Open the Teams Toolkit and click `Provision in the cloud` from DEVELOPMENT section or open the command palette and select: `Teams: Provision in the cloud`.</li><li>Open the Teams Toolkit and click `Deploy to the cloud` or open the command palette and select: `Teams: Deploy to the cloud`.</li></ul> | <ul> <li>Run command `teamsfx account login azure`.</li> <li>Run command `teamsfx account set --subscription <your-subscription-id>`.</li> <li> Run command `teamsfx provision`.</li> <li>Run command: `teamsfx deploy`. </li></ul> |
> Note: Provisioning and deployment may incur charges to your Azure Subscription.

To sideload the deployed add-in:

- Copy the production URL from the `ADDIN_ENDPOINT` in env/.env.dev file.
- Edit webpack.config.js file and change `urlProd` to the value you just copied. Please note to add a '/' at the end of the URL.
- Run `npm run build`.
- Run `npx office-addin-dev-settings sideload ./dist/manifest.json`.

## Validate manifest file

To check that your manifest file is valid:

- From Visual Studio Code: open the command palette and select: `Teams: Validate manifest file`.
- From TeamsFx CLI: run command `teamsfx validate` in your project directory.

## Known Issues
- Publish doesn't work for a Outlook add-in project now.