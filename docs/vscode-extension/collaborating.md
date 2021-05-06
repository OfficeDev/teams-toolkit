# Collaborating 

Multiple developers can collaborate on a single TeamsFx project. As the person creating the project (creator), follow these steps to allow others on your team (collaborators) to collaborate with you.

## Pre-requisites
1. [Creator] Create TeamsFx project.
2. [Creator] F5 to locally run your application. This will create an application registration in Azure Active Directory.

## Add collaborators to application registration
1. [Creator] Go to the [Azure Portal](https://portal.azure.com) and select "Azure Active Directory".
2. [Creator] Select "App Registrations" and select your Azure AD app.
3. [Creator] Select "Owners" and click "Add Owners" to add each collaborator as a owner with an administrator role.

## Add collaborators as owner of teams app
1. [Creator] Go to the [Teams Developer Portal](https://dev.teams.microsoft.com/apps/) and select your teams app.
2. [Creator] Select "Owners" and click "Add an owner" to add each collaborator as a owner.

## Share and clone the project
1. [Creator] Upload your project to Github.
2. [Creator] The client secrets are not committed to Github. Note the contents of `fx-resource-aad-app-for-teams.local_clientSecret` in the `.fx/default.userdata` file and share these secrets with your collaborators.
3. [Collaborators] Clone the project.
4. [Collaborators] Create a new file named `default.userdata` under `.fx` folder. Add the following to `default.userdata`, where `<your-secret>` is the secret that was shared with you.

```
fx-resource-aad-app-for-teams.local_clientSecret=<your-secret>
```

Now collaborators can press F5 to launch local debug on their  machine.
