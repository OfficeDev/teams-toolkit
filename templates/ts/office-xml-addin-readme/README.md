# Build Office add-ins using Teams Toolkit

Office add-ins are integrations built by third parties into Office by using our web-based platform.

## Prerequisites

- [NodeJS](https://nodejs.org/en/): 18.
- Office for Windows
- Webview2 installed for debugging Office add-in.
- [Teams Toolkit Visual Studio Code Extension](https://aka.ms/teams-toolkit) version 5.0.0 or higher.

## Debug Office add-in
- From Visual Studio Code: 
  - Start debugging the project by hitting the `F5` key in Visual Studio Code. Please run VSCode as administrator if localhost loopback for Microsoft Edge Webview hasn't been enabled (or type `N` to pass the check).
  - Click the sidebar button: start debug
- From Command Line:
  - run with command line: `npm run start`

## Edit the manifest

You can find the app manifest in the folder. The folder contains one manifest file:
* `manifest.xml`

## Validate manifest file

To check that your manifest file is valid:

- From Visual Studio Code: click `validate manifest` in extension side bar.
- From Command: run command `npm run validate` in your project directory.

## Known Issues
