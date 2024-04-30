# Welcome to Teams Toolkit!

## Quick Start

{{#enableTestToolByDefault}}
1. Press F5, or select Debug > Start Debugging menu in Visual Studio to start your app
</br>![image](https://raw.githubusercontent.com/OfficeDev/TeamsFx/dev/docs/images/visualstudio/debug/debug-button.png)
2. In Teams App Test Tool from the launched browser, type and send "helloWorld" to your app to trigger a response
{{/enableTestToolByDefault}}
{{^enableTestToolByDefault}}
1. In the debug dropdown menu, select Dev Tunnels > Create A Tunnel (set authentication type to Public) or select an existing public dev tunnel
</br>![image](https://raw.githubusercontent.com/OfficeDev/TeamsFx/dev/docs/images/visualstudio/debug/create-devtunnel-button.png)
2. Right-click the '{{NewProjectTypeName}}' project in Solution Explorer and select Teams Toolkit > Prepare Teams App Dependencies
3. If prompted, sign in to Visual Studio with a Microsoft 365 work or school account
4. Press F5, or select Debug > Start Debugging menu in Visual Studio to start your app
</br>![image](https://raw.githubusercontent.com/OfficeDev/TeamsFx/dev/docs/images/visualstudio/debug/debug-button.png)
5. In the opened web browser, select Add button to test the app in Teams
6. In the message input field, type and send "helloWorld" to your app to get a response
{{/enableTestToolByDefault}}

{{^enableTestToolByDefault}}
## Debug in Test Tool
Teams App Test Tool allows Teams app developers to test and debug bots in local easily and eliminates the necessity for prerequisites such as Microsoft 365 accounts, develop tunnels, or Teams app and bot registration. See https://github.com/OfficeDev/TeamsFx/wiki/Debug-with-Multiple-Profiles-in-Teams-Toolkit-for-Visual-Studio#start-the-app-in-teams-app-test-tool for more details.
{{/enableTestToolByDefault}}

## Run the app on other platforms

The Teams app can run in other platforms like Outlook and Microsoft 365 app. See https://aka.ms/vs-ttk-debug-multi-profiles for more details.

## Get more info

New to Teams app development or Teams Toolkit? Explore Teams app manifests, cloud deployment, and much more in the https://aka.ms/teams-toolkit-vs-docs.

Learn more advanced topic like how to customize your command bot code in 
tutorials at https://aka.ms/command-bot-tutorial

## Report an issue

Select Visual Studio > Help > Send Feedback > Report a Problem. 
Or, create an issue directly in our GitHub repository:
https://github.com/OfficeDev/TeamsFx/issues
