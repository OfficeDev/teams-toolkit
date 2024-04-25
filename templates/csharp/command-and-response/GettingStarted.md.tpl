# Welcome to Teams Toolkit!

## Quick Start

{{#enableTestToolByDefault}}
1. Press F5, or select the Debug > Start Debugging menu in Visual Studio
2. In Teams App Test Tool from the launched browser, type and send "helloWorld" to your app to trigger a response
{{/enableTestToolByDefault}}
{{^enableTestToolByDefault}}
1. In the debug dropdown menu, select Dev Tunnels > Create A Tunnel (set authentication type to Public) or select an existing public dev tunnel
2. Right-click your project and select Teams Toolkit > Prepare Teams App Dependencies
3. If prompted, sign in with a Microsoft 365 account for the Teams organization you want 
to install the app to
4. Press F5, or select the Debug > Start Debugging menu in Visual Studio
5. In the launched browser, select the Add button to load the app in Teams
6. In the chat bar, type and send "helloWorld" to your app to trigger a response
{{/enableTestToolByDefault}}

> For local debugging using Teams Toolkit CLI, you need to do some extra steps described in [Set up your Teams Toolkit CLI for local debugging](https://aka.ms/teamsfx-cli-debugging).

## Learn more

New to Teams app development or Teams Toolkit? Learn more about 
Teams app manifests, deploying to the cloud, and more in the documentation 
at https://aka.ms/teams-toolkit-vs-docs

Learn more advanced topic like how to customize your command bot code in 
tutorials at https://aka.ms/command-bot-tutorial

## Report an issue

Select Visual Studio > Help > Send Feedback > Report a Problem. 
Or, you can create an issue directly in our GitHub repository: 
https://github.com/OfficeDev/TeamsFx/issues
