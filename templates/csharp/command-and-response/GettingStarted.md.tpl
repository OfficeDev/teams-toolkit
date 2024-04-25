# Welcome to Teams Toolkit!

## Quick Start

{{#enableTestToolByDefault}}
1. Press F5, or select Debug > Start Debugging menu in Visual Studio to start your app
2. In Teams App Test Tool from the launched browser, type and send "helloWorld" to your app to trigger a response
{{/enableTestToolByDefault}}
{{^enableTestToolByDefault}}
1. In the debug dropdown menu, select Dev Tunnels > Create A Tunnel (set authentication type to Public) or select an existing public dev tunnel
2. Right-click your project in Solution Explorer and select Teams Toolkit > Prepare Teams App Dependencies
3. If prompted, sign in to Visual Studio with a Microsoft 365 work or school account
4. Press F5, or select Debug > Start Debugging menu in Visual Studio to start your app
5. In the opened web browser, select Add button to test the app in Teams
6. In the message input field, type and send "helloWorld" to your app to get a response
{{/enableTestToolByDefault}}

> For local debugging using Teams Toolkit CLI, you need to do some extra steps described in [Set up your Teams Toolkit for debugging](https://learn.microsoft.com/en-us/microsoftteams/platform/toolkit/debug-local?tabs=cli).

## Get more info

New to Teams app development or Teams Toolkit? Explore Teams app manifests, cloud deployment, and much more in the https://aka.ms/teams-toolkit-vs-docs.

Learn more advanced topic like how to customize your command bot code in 
tutorials at https://aka.ms/command-bot-tutorial

## Report an issue

Select Visual Studio > Help > Send Feedback > Report a Problem. 
Or, create an issue directly in our GitHub repository:
https://github.com/OfficeDev/TeamsFx/issues
