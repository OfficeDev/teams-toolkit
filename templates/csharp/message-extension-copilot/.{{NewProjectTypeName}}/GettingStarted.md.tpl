# Welcome to Teams Toolkit!

## Quick Start

> **Prerequisites**
>
> To run the app template in your local dev machine, you will need:
>
> - [Visual Studio 2022](https://aka.ms/vs) 17.8 or higher and [install Teams Toolkit](https://aka.ms/install-teams-toolkit-vs).
> - A [Microsoft 365 account for development](https://docs.microsoft.com/microsoftteams/platform/toolkit/accounts).
> - Join Microsoft 365 Copilot Plugin development [early access program](https://aka.ms/plugins-dev-waitlist).

1. In the debug dropdown menu, select `Dev Tunnels > Create a Tunnel` (set authentication type to Public) or select an existing public dev tunnel
![image](https://raw.githubusercontent.com/OfficeDev/TeamsFx/dev/docs/images/visualstudio/debug/create-devtunnel-button.png).
2. Right-click your `{{NewProjectTypeName}}` project and select `Teams Toolkit > Prepare Teams App Dependencies`.
3. If prompted, sign in with a Microsoft 365 account for the Teams organization you want
   to install the app to.
4. Press F5, or select the Debug > Start Debugging menu in Visual Studio
![image](https://raw.githubusercontent.com/OfficeDev/TeamsFx/dev/docs/images/visualstudio/debug/debug-button.png)
5. In the launched browser, select the Add button to load the app in Teams.
6. You can search NuGet package from compose message area, or from the command box.
5. To trigger the Message Extension through Copilot, you can:
      
## Start multiple profile
Instead of launching the app in Teams client with default profile, you can also run your app with other profile like App Test Tool, office.com and outlook or even Copilot. You can select profile to start.
1. Go to Tools -> Options -> Preview Features:
2. Check "Enable Multi-Project Launch Profiles"
![image](https://raw.githubusercontent.com/OfficeDev/TeamsFx/dev/docs/images/visualstudio/debug/enable-multiple-profiles-feature.png)

### Trigger the Message Extension through Copilot
2. Select `Copilot (browser)` in debug dropdown menu
![image](https://raw.githubusercontent.com/OfficeDev/TeamsFx/dev/docs/images/visualstudio/debug/switch-to-copilot.png)
2. When Teams launches in the browser, click the Apps icon from Teams client left rail to open Teams app store and search for Copilot.
3. Open the Copilot app and send a prompt to trigger your plugin.
4. Send a message to Copilot to find an NuGet package information. For example: Find the NuGet package info on Microsoft.CSharp.
   > Note: This prompt may not always make Copilot include a response from your message extension. If it happens, try some other prompts or leave a feedback to us by thumbing down the Copilot response and leave a message tagged with [MessageExtension].

## Learn more

- [Extend Microsoft 365 Copilot](https://aka.ms/teamsfx-copilot-plugin)

## Report an issue

Select Visual Studio > Help > Send Feedback > Report a Problem.
Or, you can create an issue directly in our GitHub repository:
https://github.com/OfficeDev/TeamsFx/issues
