# Welcome to Teams Toolkit!

## Quick Start

{{#enableTestToolByDefault}}
1. Press F5, or select the Debug > Start Debugging menu in Visual Studio
2. Teams App Test Tool will be opened in the launched browser 
3. [If you selected http trigger] Open Windows PowerShell and post a HTTP request to trigger 
the notification(replace <endpoint> with real endpoint, for example localhost:5130):

   Invoke-WebRequest -Uri "http://<endpoint>/api/notification" -Method Post
   
{{/enableTestToolByDefault}}
{{^enableTestToolByDefault}}
1. In the debug dropdown menu, select Dev Tunnels > Create A Tunnel (set authentication type to Public) or select an existing public dev tunnel
2. Right-click your project and select Teams Toolkit > Prepare Teams App Dependencies
3. If prompted, sign in with a Microsoft 365 account for the Teams organization you want 
to install the app to
4. Press F5, or select the Debug > Start Debugging menu in Visual Studio
5. In the launched browser, select the Add button to load the app in Teams
6. [If you selected http trigger] Open Windows PowerShell and post a HTTP request to trigger 
the notification(replace <endpoint> with real endpoint, for example localhost:5130):

   Invoke-WebRequest -Uri "http://<endpoint>/api/notification" -Method Post
   
{{/enableTestToolByDefault}}

> For local debugging using Teams Toolkit CLI, you need to do some extra steps described in [Set up your Teams Toolkit CLI for local debugging](https://aka.ms/teamsfx-cli-debugging).

{{^enableTestToolByDefault}}
## Debug in Test Tool
Teams App Test Tool allows Teams app developers to test and debug bots in local easily and eliminates the necessity for prerequisites such as Microsoft 365 accounts, develop tunnels, or Teams app and bot registration. See https://github.com/OfficeDev/TeamsFx/wiki/Debug-with-Multiple-Profiles-in-Teams-Toolkit-for-Visual-Studio#start-the-app-in-teams-app-test-tool for more details.
{{/enableTestToolByDefault}}

## Learn more

New to Teams app development or Teams Toolkit? Learn more about 
Teams app manifests, deploying to the cloud, and more in the documentation 
at https://aka.ms/teams-toolkit-vs-docs

Learn more advanced topic like how to customize your notification bot code in 
tutorials at https://aka.ms/notification-bot-tutorial

## Report an issue

Select Visual Studio > Help > Send Feedback > Report a Problem. 
Or, you can create an issue directly in our GitHub repository: 
https://github.com/OfficeDev/TeamsFx/issues
