# Collaborating 

Multiple developers collaborating on a Teams application should set up their own environments for development including unique [M365 Developer Tenants](https://developer.microsoft.com/en-us/microsoft-365/dev-program) and application registrations in Azure Active Directory. This way each developer runs their code under a different application identity. If an identity is to be shared between multiple developers (such as in a staging or integration environment) there are two points of registration which need to be configured to allow multiple developers to run the same app. Azure Active Directory and Teams Developer Portal

As the person creating the project (creator), follow these steps to allow others on your team (collaborators) to collaborate on your application.

## Pre-requisites
1. [Creator] Create a project with the Teams Toolkit in the IDE or teamsfx CLI.
2. [Creator] Start your application locally at least once. This will create an application registration in Azure Active Directory.
3. [Creator] Go to the [Teams Amdmin Center](https://admin.teams.microsoft.com/policies/app-setup) and select "Global (Org-wide default)", make sure "Upload custom apps" settings is turned to on.

## Add collaborators to application registration
1. [Creator] Go to the [Azure Portal](https://portal.azure.com) and select "Azure Active Directory".
2. [Creator] Select "App Registrations" and select your Azure AD app.
3. [Creator] Select "Owners" and click "Add Owners" to add each collaborator as a owner with an administrator role.

## Add collaborators as owner of teams app
1. [Creator] Go to the [Teams Developer Portal](https://dev.teams.microsoft.com/apps/) and select your teams app.
2. [Creator] Select "Owners" and click "Add an owner" to add each collaborator as a owner.

## Share the project
1. [Creator] Upload your project to Github.
2. [Creator] The client secrets are not committed to Github. Note the contents of `fx-resource-aad-app-for-teams.local_clientSecret` in the `.fx/default.userdata` file and share these secrets with your collaborators.

## Collaborators
1. [Collaborators] Clone the project.
2. [Collaborators] Create a new file named `default.userdata` under `.fx` folder. Add the following to `default.userdata`, where `<your-secret>` is the secret that was shared with you.

```
fx-resource-aad-app-for-teams.local_clientSecret=<your-secret>
```

Now collaborators can start the application and debug locally on their machines.
