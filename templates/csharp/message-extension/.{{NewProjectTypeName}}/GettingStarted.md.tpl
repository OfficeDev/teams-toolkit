# Welcome to Teams Toolkit!

## Quick Start

1. In the debug dropdown menu, select Dev Tunnels > Create A Tunnel (set authentication type to Public) or select an existing public dev tunnel
</br>![image](https://raw.githubusercontent.com/OfficeDev/TeamsFx/dev/docs/images/visualstudio/debug/create-devtunnel-button.png)
2. Right-click the '{{NewProjectTypeName}}' project in Solution Explorer and select Teams Toolkit > Prepare Teams App Dependencies
3. If prompted, sign in to Visual Studio with a Microsoft 365 work or school account
4. Press F5, or select Debug > Start Debugging menu in Visual Studio to start your app
</br>![image](https://raw.githubusercontent.com/OfficeDev/TeamsFx/dev/docs/images/visualstudio/debug/debug-button.png)
5. In the opened web browser, select Add button to test the app in Teams
6. You can play with this app to create an adaptive card, search for an NuGet package or unfurl links from ".botframework.com" domain.

## Run the app on other platforms

The unified app manifest for a Teams app supports extending other experiences like Outlook and the Microsoft 365 app. To simplify this with Teams Toolkit, we use Multi-Project Launch Profiles to make other targets available for you to select. To use this feature:

1. Go to Tools -> Options -> Preview Features
2. Select 'Enable Multi-Project Launch Profiles'
</br>![image](https://raw.githubusercontent.com/OfficeDev/TeamsFx/dev/docs/images/visualstudio/debug/enable-multiple-profiles-feature.png)

### Start the app in Outlook
1. Select `Outlook (browser)` in debug dropdown menu
</br>![image](https://raw.githubusercontent.com/OfficeDev/TeamsFx/dev/docs/images/visualstudio/debug/switch-to-outlook.png)
2. Press F5, or select Debug > Start Debugging menu in Visual Studio
</br>![image](https://raw.githubusercontent.com/OfficeDev/TeamsFx/dev/docs/images/visualstudio/debug/debug-button.png)

## Get more info

New to Teams app development or Teams Toolkit? Explore Teams app manifests, cloud deployment, and much more in the https://aka.ms/teams-toolkit-vs-docs.

## Report an issue

Select Visual Studio > Help > Send Feedback > Report a Problem. 
Or, create an issue directly in our GitHub repository:
https://github.com/OfficeDev/TeamsFx/issues
