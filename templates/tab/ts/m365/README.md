# Personal tab across Microsoft 365

Personal tabs provide a great way to enhance the Microsoft Teams experience. Using personal tabs, you can provide a user access to their application right within Teams, without the user having to leave the experience or sign in again. Now, personal tabs can light up within other Microsoft 365 applications. You can build and run your personal tabs in Teams, both Outlook desktop and web experiences, and also Office on the web (office.com).

![Personal tab demo](https://user-images.githubusercontent.com/11220663/167839153-0aef6adc-450e-4b8c-a28f-7d27005d1093.png)

## Prerequisites

- [NodeJS](https://nodejs.org/en/)
- An M365 account. If you do not have M365 account, apply one from [M365 developer program](https://developer.microsoft.com/microsoft-365/dev-program)
- [Set up your dev environment for extending Teams apps across Microsoft 365](https://aka.ms/teamsfx-m365-apps-prerequisites)
> Please note that after you enrolled your developer tenant in Office 365 Target Release, it may take couple days for the enrollment to take effect.
- [Teams Toolkit Visual Studio Code Extension](https://aka.ms/teams-toolkit) or [TeamsFx CLI](https://aka.ms/teamsfx-cli)

## Getting Started

Follow below instructions to get started with this application template for local debugging.

### Test your application with Visual Studio Code

1. Press `F5` or use the `Run and Debug Activity Panel` in Visual Studio Code.
1. Select a target Microsoft 365 application where the personal tabs can run: `Debug in Teams`, `Debug in Outlook` or `Debug in Office` and click the `Run and Debug` green arrow button.
1. If you select `Debug in Outlook` or `Debug in Office`, follow the instructions in a Visual Studio Code pop-up dialog.
1. Click **Install in Teams** first and install the app in a Teams web client.
1. After installing the app in Teams, come back and click **Continue** to continue to debug the app in Outlook web client or office.com.

    ![Debug pop up VSC](https://user-images.githubusercontent.com/11220663/167839258-0ee73600-ce32-4c8f-9876-826d90716510.png)

### Test your application with TeamsFx CLI

1. Start debugging the project by executing the command `teamsfx preview --local --m365-host <m365-host>` in your project directory, where options for `m365-host` are `teams`, `outlook` or `office`.
1. If you select `m365-host` as `outlook` or `office`, follow the instructions in the command dialog.

    ![Debug pop up CLI](https://user-images.githubusercontent.com/11220663/167839636-de3a71db-caa6-4571-91a4-05428779b1fa.png)

1. Select **Install in Teams** first and install the app in a Teams web client.
1. After installed the app in Teams, come back and select **Continue** to continue to debug the app in Outlook web client or office.com.

## References

* [Extend a Teams personal tabs across Microsoft 365](https://docs.microsoft.com/microsoftteams/platform/m365-apps/extend-m365-teams-personal-tab?tabs=manifest-teams-toolkit)
* [Teams Toolkit Documentations](https://docs.microsoft.com/microsoftteams/platform/toolkit/teams-toolkit-fundamentals)
* [Teams Toolkit CLI](https://docs.microsoft.com/microsoftteams/platform/toolkit/teamsfx-cli)
* [TeamsFx SDK](https://docs.microsoft.com/microsoftteams/platform/toolkit/teamsfx-sdk)
* [Teams Toolkit Samples](https://github.com/OfficeDev/TeamsFx-Samples)
