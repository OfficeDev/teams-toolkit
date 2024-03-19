# Welcome to Teams Toolkit!

## Quick Start

1. In the debug dropdown menu, select Dev Tunnels > Create A Tunnel (set authentication type to Public) or select an existing public dev tunnel
![image](https://raw.githubusercontent.com/OfficeDev/TeamsFx/dev/docs/images/visualstudio/debug/create-devtunnel-button.png)
2. Right-click your `{{NewProjectTypeName}}` project and select Teams Toolkit > Prepare Teams App Dependencies
3. If prompted, sign in with a Microsoft 365 account for the Teams organization you want 
to install the app to
4. Press F5, or select the Debug > Start Debugging menu in Visual Studio
![image](https://raw.githubusercontent.com/OfficeDev/TeamsFx/dev/docs/images/visualstudio/debug/debug-button.png)
5. In the launched browser, select the Add button to load the app in Teams
6. You can search nuget package from compose message area, or from the command box.

## Start multiple profile
Instead of launching the app in Teams client with default profile, you can also run your app with other profile like App Test Tool, office.com and outlook or even Copilot. You can select profile to start.
1. Go to Tools -> Options -> Preview Features:
2. Check "Enable Multi-Project Launch Profiles"
![image](https://raw.githubusercontent.com/OfficeDev/TeamsFx/dev/docs/images/visualstudio/debug/enable-multiple-profiles-feature.png)

### Debug app in Outlook
2. Select `Outlook (browser)` in debug dropdown menu
![image](https://raw.githubusercontent.com/OfficeDev/TeamsFx/dev/docs/images/visualstudio/debug/switch-to-outlook.png)
3. Press F5, or select the Debug > Start Debugging menu in Visual Studio
![image](https://raw.githubusercontent.com/OfficeDev/TeamsFx/dev/docs/images/visualstudio/debug/debug-button.png)

## Learn more

New to Teams app development or Teams Toolkit? Learn more about 
Teams app manifests, deploying to the cloud, and more in the documentation 
at https://aka.ms/teams-toolkit-vs-docs

## Report an issue

Select Visual Studio > Help > Send Feedback > Report a Problem. 
Or, you can create an issue directly in our GitHub repository: 
https://github.com/OfficeDev/TeamsFx/issues
