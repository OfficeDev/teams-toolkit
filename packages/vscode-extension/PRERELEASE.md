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

Changelog:
- Removed subscriptions from the sidebar's "ACCOUNTS" section.
- Removed the "ENVIRONMENT" section from sidebar.
- Removed the "Edit manifest file" button from the sidebar's "DEVELOPMENT" section.
- Added a "Add environment" button to the sidebar's "DEVELOPMENT" section.
- Added a "Manage collaborator" button to sidebar's "DEVELOPMENT" section.
- Removed `.fx` folder from Teams Toolkit scaffolded templates.
- Moved `template/appPackage` to the root folder for templates.
- Added a `env` folder to manage all `.env` files in template root folders.
- Added a `infra` folder to organize bicep files in template root folders.
- Added teamsapp.yml and teamsapp.local.yml files to manage configuration and lifecycles in template root folders.
- Flattened the source code file structure for tempaltes, application code is no longer organized by capability.
