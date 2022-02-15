# Collaborating 

Multiple developers collaborating on a Teams app should set up their own environments for development including unique [M365 Developer Tenants](https://developer.microsoft.com/en-us/microsoft-365/dev-program) and application registrations in Azure Active Directory. This way each developer runs their code under a different application identity. Our extension provide ability for developers to set up their own local-debug environment. **Every developer can simply press `F5` to start his own application locally.**

If you want to share the local-debug environment, please follow the steps in [Sharing Local Environment](#sharing-local-environment).

## Sharing Local Environment

If local-debug environment is to be shared between multiple developers, there are three points of registration which need to be configured to allow multiple developers to run the same app. Azure Active Directory, Teams Developer Portal and Bot Framework.

As the person creating the project (creator), follow these steps to allow others on your team (collaborators) to collaborate on your application.

### Pre-requisites
1. [Creator] Create a project with the Teams Toolkit in the IDE or teamsfx CLI.
2. [Creator] Start your application locally at least once. This will create an application registration in Azure Active Directory.
3. [Creator] Go to the [Teams Admin Center](https://admin.teams.microsoft.com/policies/app-setup) and select "Global (Org-wide default)". Ensure "Upload custom apps" is turned on.

### Add collaborators to application registration
1. [Creator] Go to the [Azure Portal](https://portal.azure.com) and select "Azure Active Directory".
2. [Creator] Select "App Registrations" and select your Azure AD app.
3. [Creator] Select "Owners" and click "Add Owners" to add each collaborator as an owner with an administrator role.

### Add collaborators as owner of teams app
1. [Creator] Go to the [Teams Developer Portal](https://dev.teams.microsoft.com/apps/) and select your teams app.
2. [Creator] Select "Owners" and click "Add an owner" to add each collaborator as an owner.

### Add collaborators as owner of bot (Only necessary when bot is enabled in the project)
1. [Creator] Go to the [Bot Framework](https://dev.botframework.com/bots) and select your bot.
2. [Creator] Select "Settings", add email addresses of collaborators in "Admin" and click "Save changes".

### Share the project
1. [Creator] Upload your project to Github.
2. [Creator] The required **.fx/config/localSettings.json** file is not committed to Github. You need to share this file with your collaborators.

### Collaborators
1. [Collaborators] Clone the project.
2. [Collaborators] Copy **.fx/config/localSettings.json** file to the project.
3. [Collaborators] Login M365 account which has been added as collaborator.

Now collaborators can start the application and debug locally on their machines.
