# Welcome to Teams Toolkit!

## Quick Start

> **Prerequisites**
>
> To run the app template in your local dev machine, you will need:
>
> - [Visual Studio 2022](https://aka.ms/vs) 17.8 or higher and [install Teams Toolkit](https://aka.ms/install-teams-toolkit-vs).
> - A [Microsoft 365 account for development](https://docs.microsoft.com/microsoftteams/platform/toolkit/accounts).
> - [Microsoft 365 Copilot license](https://learn.microsoft.com/microsoft-365-copilot/extensibility/prerequisites#prerequisites)

1. In the debug dropdown menu, select `Dev Tunnels > Create a Tunnel` (set authentication type to Public) or select an existing public dev tunnel.
2. Right-click your project and select `Teams Toolkit > Prepare Teams App Dependencies`.
3. If prompted, sign in with a Microsoft 365 account for the Teams organization you want
   to install the app to.
4. To directly trigger the Message Extension in Teams, you can:
   1. In the debug dropdown menu, select `Microsoft Teams (browser)`.
   2. In the launched browser, select the Add button to load the app in Teams.
   3. You can search NuGet package from compose message area, or from the command box.
5. To trigger the Message Extension through Copilot, you can:
   1. In the debug dropdown menu, select `Copilot (browser)`.
   2. When Teams launches in the browser, click the Apps icon from Teams client left rail to open Teams app store and search for Copilot.
   3. Open the `Copilot` app, select `Plugins`, and from the list of plugins, turn on the toggle for your message extension. Now, you can send a prompt to trigger your plugin.
   4. Send a message to Copilot to find an NuGet package information. For example: Find the NuGet package info on Microsoft.CSharp.
      > Note: This prompt may not always make Copilot include a response from your message extension. If it happens, try some other prompts or leave a feedback to us by thumbing down the Copilot response and leave a message tagged with [MessageExtension].

> For local debugging using Teams Toolkit CLI, you need to do some extra steps described in [Set up your Teams Toolkit CLI for local debugging](https://aka.ms/teamsfx-cli-debugging).

## Learn more

- [Extend Microsoft 365 Copilot](https://aka.ms/teamsfx-copilot-plugin)

## Report an issue

Select Visual Studio > Help > Send Feedback > Report a Problem.
Or, you can create an issue directly in our GitHub repository:
https://github.com/OfficeDev/TeamsFx/issues
