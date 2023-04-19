# Teams Toolkit v5.0 Pre-release

### What does pre-release mean?
Pre-release is meant for those who are eager to try the latest Teams Toolkit features and fixes. Even though pre-releases are not intended for use in production, they are at a sufficient quality level for you to generally use and [provide feedback](https://aka.ms/ttk-feedback). However, pre-release versions can and probably will change, and those changes could be major.

We've addressed a number of reported bugs and added major changes in this release based on your feedback to make Teams Toolkit more flexible. Some of the key highlights to these changes include:

- Use existing infrastructure, resource groups, and more when provisioning
- Use an existing Teams app ID
- Use an existing Azure AD app registration ID
- Use a different tunneling solution or customize the defaults
- Add custom steps to debugging, provisioning, deploying, publishing, etc.

### What about my existing Teams Toolkit projects?
The changes in this pre-release require upgrades to the TeamsFx configuration files. We recommend that you create a new app using this version. In the future, we'll provide a way to automatically upgrade existing Teams apps that were created with a previous version of Teams Toolkit.

Learn more about the changes in this pre-release at [https://aka.ms/teamsfx-v5.0-guide](https://aka.ms/teamsfx-v5.0-guide).

# Search based message extension across Microsoft 365

Search-based [message extensions](https://docs.microsoft.com/microsoftteams/platform/messaging-extensions/what-are-messaging-extensions?tabs=nodejs) allow users to search an external system and share results through the compose message area of the Microsoft Teams client. You can now build and run your search-based message extensions in Teams, Outlook for Windows desktop and web experiences.

![Search app demo](https://user-images.githubusercontent.com/11220663/167868361-40ffaaa3-0300-4313-ae22-0f0bab49c329.png)

## Prerequisites

- [Node.js](https://nodejs.org/), supported versions: 14, 16, 18
- An M365 account. If you do not have M365 account, apply one from [M365 developer program](https://developer.microsoft.com/microsoft-365/dev-program)
- [Set up your dev environment for extending Teams apps across Microsoft 365](https://aka.ms/teamsfx-m365-apps-prerequisites)
> Please note that after you enrolled your developer tenant in Office 365 Target Release, it may take couple days for the enrollment to take effect.
- [Teams Toolkit Visual Studio Code Extension](https://aka.ms/teams-toolkit) or [TeamsFx CLI](https://aka.ms/teamsfx-cli)

## Getting Started

Follow below instructions to get started with this application template for local debugging.

### Test your application with Visual Studio Code

1. Press `F5` or use the `Run and Debug Activity Panel` in Visual Studio Code.
1. Select a target Microsoft application where the message extension runs: `Debug in Teams`, `Debug in Outlook` and click the `Run and Debug` green arrow button.

### Test your application with TeamsFx CLI
1. Install [ngrok](https://ngrok.com/download) and start your local tunnel service by running the command `ngrok http 3978`.
1. In the `env/.env.local` file, fill in the values for `BOT_DOMAIN` and `BOT_ENDPOINT` with your ngrok URL.
   ```
   BOT_DOMAIN=sample-id.ngrok.io
   BOT_ENDPOINT=http://sample-id.ngrok.io
   ```
1. Executing the command `teamsfx provision --env local` in your project directory.
1. Executing the command `teamsfx deploy --env local` in your project directory.
1. Executing the command `teamsfx preview --env local --m365-host <m365-host>` in your project directory, where options for `m365-host` are `teams` or `outlook`.

## Use this message extension app

This template provides a simple functionality to search for `npm` packages and render the result in [Adaptive Card](https://docs.microsoft.com/microsoftteams/platform/task-modules-and-cards/cards/design-effective-cards?tabs=design).

### Use this app in Teams

- `@mention` Your message extension from the `search box area`.

    ![AtBotFromSearch](https://user-images.githubusercontent.com/11220663/167869365-3828ef85-64f7-43bf-9f75-99d882370154.png)

- `@mention` your message extension from the `compose message area`.

    ![AtBotFromMessage](https://user-images.githubusercontent.com/11220663/167869475-528736fa-d0f1-4bf8-9c23-fdffae984802.png)

- Click the `...` under compose message area, find your message extension.

    ![ComposeArea](https://user-images.githubusercontent.com/11220663/167869578-ce33b2ef-f5f2-4be7-a7a0-57e53b6f7c36.png)

### Use this app in Outlook

- Click the "More apps" icon under compose email area, find your message extension.
  
    ![InOutlook](https://user-images.githubusercontent.com/11220663/167869656-20225f14-f982-4e47-8dd0-050285d56853.png)

## References

* [Extend a Teams message extension across Microsoft 365](https://docs.microsoft.com/microsoftteams/platform/m365-apps/extend-m365-teams-message-extension?tabs=manifest-teams-toolkit)
* [Bot Framework Documentation](https://docs.botframework.com/)
* [Teams Toolkit Documentations](https://docs.microsoft.com/microsoftteams/platform/toolkit/teams-toolkit-fundamentals)
* [Teams Toolkit CLI](https://docs.microsoft.com/microsoftteams/platform/toolkit/teamsfx-cli)
* [TeamsFx SDK](https://docs.microsoft.com/microsoftteams/platform/toolkit/teamsfx-sdk)
* [Teams Toolkit Samples](https://github.com/OfficeDev/TeamsFx-Samples)