# Welcome to Teams Toolkit!

## Quick Start

> **Prerequisites**
>
> To run the app template in your local dev machine, you will need:
>
> - [Visual Studio 2022](https://aka.ms/vs) 17.8 or higher and [install Teams Toolkit](https://aka.ms/install-teams-toolkit-vs).
> - A [Microsoft 365 account for development](https://docs.microsoft.com/microsoftteams/platform/toolkit/accounts)
> - Join Microsoft 365 Copilot Plugin development [early access program](https://aka.ms/plugins-dev-waitlist).

1. In the debug dropdown menu, select Dev Tunnels > Create a Tunnel (set authentication type to Public) or select an existing public dev tunnel
</br>![image](https://raw.githubusercontent.com/OfficeDev/TeamsFx/dev/docs/images/visualstudio/debug/create-devtunnel-button.png).
2. Right-click the '{{NewProjectTypeName}}' project and select Teams Toolkit > Prepare Teams App Dependencies
3. If prompted, sign in with a Microsoft 365 account for the Teams organization you want
   to install the app to.
4. Press F5, or select Debug > Start Debugging menu in Visual Studio to start your app
</br>![image](https://raw.githubusercontent.com/OfficeDev/TeamsFx/dev/docs/images/visualstudio/debug/debug-button.png)
5. In the launched browser, select the Add button to load the app in Teams.
6. You can search for NuGet package from the message input field or the command box.
      
## Run the app on other platforms

The unified app manifest for a Teams app supports extending other experiences like Outlook and the Microsoft 365 app. To simplify this with Teams Toolkit, we use Multi-Project Launch Profiles to make other targets available for you to select. To use this feature:

1. Go to Tools -> Options -> Preview Features
2. Select 'Enable Multi-Project Launch Profiles'
</br>![image](https://raw.githubusercontent.com/OfficeDev/TeamsFx/dev/docs/images/visualstudio/debug/enable-multiple-profiles-feature.png)

### Start the app in Copilot
1. Select `Copilot (browser)` in debug dropdown menu
</br>![image](https://raw.githubusercontent.com/OfficeDev/TeamsFx/dev/docs/images/visualstudio/debug/switch-to-copilot.png)
2. When Teams launches in the browser, click the Apps icon from Teams client left rail to open Teams app store and search for Copilot.
3. Open the Copilot app and send a prompt to trigger your plugin.
4. Send a message to Copilot to find an NuGet package information. For example: Find the NuGet package info on Microsoft.CSharp.
   > Note: This prompt may not always make Copilot include a response from your message extension. If it happens, try some other prompts or leave a feedback to us by thumbing down the Copilot response and leave a message tagged with [MessageExtension].

## Get more info

- [Extend Microsoft 365 Copilot](https://aka.ms/teamsfx-copilot-plugin)

## Report an issue

Select Visual Studio > Help > Send Feedback > Report a Problem.
Or, create an issue directly in our GitHub repository:
https://github.com/OfficeDev/TeamsFx/issues
