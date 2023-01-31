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

# More Information

You have a new Teams project scaffolded! To understand more about the structure of the project, you can read the readme files listed below to get further information.

Microsoft Teams apps bring key information, common tools, and trusted processes to where people increasingly gather, learn, and work.Apps are how you extend Teams to fit your needs. Create something brand new for Teams or integrate an existing app.

There are multiple ways to extend Teams, so every app is unique. Some only have one capability, while others have more than one feature to give users various options. For example, your app can display data in a central location, that is, the tab and present that same information through a conversational interface, that is, the bot.

[What is Teams app capabilities](https://aka.ms/teamsfx-capabilities-overview)

## Capabilities scaffolded in this project

- Tab capabilities: [README](./tab/README.md)
- Bot capabilities: [README](./bot/README.md)
