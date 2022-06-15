# Teams Toolkit Prerequisites Checker

Teams Toolkit checks the following prerequisites during the debug process:
* Check if Ngrok is launched for bot and message extension.
* Check if the Teams app dependencies is prepared.

## Troubleshooting

### Ngrok tunnel is not connected

To run/debug a notification/command bot or message extension, you'll need to setup [Ngrok](https://ngrok.com/) first. Ngrok is used to forward external messages from Azure Bot Framework to your local machine.

Use a Command Prompt to run this command: `ngrok http 5130`.

### Teams app dependencies are not prepared

In Visual Studio Solution Explorer, right click on your project file and select "Prepare Teams app dependencies". You will be asked to login to your M365 account. This command will prepare local debug dependencies and register a Teams app in the tenant which your account belongs to.

Notes: your M365 account need to have the sideloading permission to ensure Teams app can be uploaded to your tenant, otherwise you will end up with failure to see your Teams app running in Teams client. Learn more about sideloading permission by visiting [here](https://docs.microsoft.com/en-us/microsoftteams/platform/concepts/build-and-test/prepare-your-o365-tenant#enable-custom-teams-apps-and-turn-on-custom-app-uploading). 
