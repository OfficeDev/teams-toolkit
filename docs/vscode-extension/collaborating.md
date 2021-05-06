# Collaborating 

Multiple developers can collaborate by using the same Azure Active Directory app. Please follow the steps after you create a new TeamsFx project and successfully run local debug. Need to attention that the steps include steps for creator and collaborators.

## Add collaborator as owner of Azure AD app
1. [Creator] Go to Azure Portal, select "Azure Active Directory".
2. [Creator] Select "App Registrations" and select you Azure AD app.
3. [Creator] Select "Owners" and click "Add Owners" to add collaborators as owners.

## Add collaborator as owner of teams app
1. [Creator] Go to [Developer Portal](https://dev.teams.microsoft.com/apps/), and click on your teams app.
2. [Creator] Select "Owners" and and click "Add an owner" to add collaborators as owners.

## Share and clone the project
1. [Creator] Upload your project to github.
2. [Creator] Take a note of `fx-resource-aad-app-for-teams.local_clientSecret` in `.fx/default.userdata` file and share with collaborators.
3. [Collaborators] Clone the project.
4. [Collaborators] Create a new file named `default.userdata` under `.fx` folder, and add a new line where `your-secret` is the secret creator shared with you.

```
fx-resource-aad-app-for-teams.local_clientSecret=your-secret
```

Now collaborators can press F5 to launch local debug on their own machine.