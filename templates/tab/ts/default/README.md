
# Tabs
Tabs are Teams-aware webpages embedded in Microsoft Teams. A channel/group tab delivers content to channels and group chats, and are a great way to create collaborative spaces around dedicated web-based content. A personal tab is something users interact with individually.

## Prerequisites
-  [NodeJS](https://nodejs.org/en/)

-  [An M365 account](https://docs.microsoft.com/en-us/microsoftteams/platform/concepts/build-and-test/prepare-your-o365-tenant) or access to a Teams account with the appropriate permissions to install an app. To get a free developer subsription [click here](https://developer.microsoft.com/en-us/microsoft-365/dev-program).

## Build
In the project directory, execute:

```
npm install
npm run build
```
## Run in development mode
To start your app in development mode, watching changes and reloading automatically:
```
npm start
```

## Debugging
Start debugging the project by hitting the `F5` key or click the debug icon in Visual Studio Code and click the `Start Debugging` green arrow button.

## Tests and manifest validation
To check that your manifest is valid:
```
npm run test
```

## Deploying to Azure
This project is ready to deploy to Azure, you'll need to sign in with an account that has an Azure subscription:
```
az login
npm run deploy
```

## Publishing to Teams
Once deployed, you may want to submit your application to your organization's internal app store. Your app will be submitted for admin approval with the following command:
```
npm run publish-teams
```