## Using existing Azure AD app in TeamsFx project

This doc is for using existing Azure AD app or Manually Create Azure AD app for TeamsFx project. Please follow the instruction and make sure all reqirued info is properly set in your TeamsFx project.


### Create an Azure AD app

* You may skip this part if you are using an existing Azure AD app.

1. Go to the [Azure Portal](https://portal.azure.com) and select "Azure Active Directory".

1. Select "App Registrations" and click on "New registration" to create a new Azure AD app:
   * **Name**: The name of your configuration app.
   * **Supported account types**: Select "Account in this organizational directory only"
   * Leave the "Redirect URL" field blank for now.
   * Click on the "Register" button.

1. When the app is registered, you'll be taken to the app's "Overview" page. Copy the **Application (client) ID** and **Object ID**; we will need it later. Verify that the "Supported account types" is set to **My organization only**.

### Create client secret for Azure AD app

* You may skip this part if you are using an existing Azure AD app.

1. Go to app's "Certificates & secrets" page, select "Client Secret" and Click on "New client secret".
   * **Description**: The descirption of your client secret.
   * **Expires**: The expire time of your client secret.
   * Click on the "Add" button.

1. When the client secret is added, press the copy button under the "Value" column to copy the **Client Secret**.


### Create Access As User Scope for Azure AD app

* You may skip this part if you are using an existing Azure AD app.

1. Go to app's "Expose an API" page, click on "Add a scope" under "Scopes defined by this API".
   * Click on "Save and continue".
   * **Scope name**: Fill in "access_as_user".
   * **Who can consent?**: Choose "Admins and users".
   * **Admin consent display name**: Fill in "Teams can access app’s web APIs".
   * **Admin consent description**: Fill in "Allows Teams to call the app’s web APIs as the current user.".
   * **User consent display name**: Fill in "Teams can access app’s web APIs and make requests on your behalf".
   * **User consent description**: Fill in "Enable Teams to call this app’s web APIs with the same rights that you have".
   * **State**: Choose "Enabled".
   * Click on "Add scope".

1. On the same page, click on "Add a client application" under "Authorized client applications".
   * **Client ID**: Fill in "1fec8e78-bce4-4aaf-ab1b-5451cc387264" which is Client Id for Teams on mobile and client.
   * **Authorized scopes**: Choose the existing "access_as_user" scope.
   * Click on "Add application".

1. Click again on "Add a client application".
   * **Client ID**: Fill in "5e3ce6c0-2b1f-4285-8d4b-75ee78787346" which is Client Id for Teams on web.
   * **Authorized scopes**: Choose the existing "access_as_user" scope.
   * Click on "Add application".

2. Go to app's "Manifest" page, copy the "id" under "oauth2Permissions" as **Access As User Scope ID**.


### Get necessary info from existing Azure AD app

* You may skip this part if you follow the instruction above to create an Azure AD app.

1. Go to the [Azure Portal](https://portal.azure.com) and select "Azure Active Directory".

1.  Select "App Registrations" and find your existing Azure AD app.

1. Go to app's "Overview" page, copy the **Application (client) ID** and **Object ID**; we will need it later. Verify that the "Supported account types" is set to **My organization only**.

1. Go to app's "Certificates & secrets" page, press the copy button under the "Value" column to copy the **Client Secret**. Note: if you can not copy the secret, please follow the [instruction](#create-client-secret-for-azure-ad-app) to create a new client secret.

1. Go to app's "Expose an API" page, make sure you have already add "access_as_user" scope under "Scopes defined by this API" and pre-auth the two Teams Client Ids. If not, please follow the [instruction](#create-access-as-user-scope-for-azure-ad-app).

1. Go to app's "Manifest" page, copy the "id" under "oauth2Permissions" as **Access As User Scope ID**.


### Set necessary info in TeamsFx project

1. Open your TeamsFx project, and open `.fx/configs/config.dev.json`.

1. Set `AAD_APP_CLIENT_SECRET` = **Client Secret** in your system environment variable.

1. Add follow code after existing code.

  ```
  "$schema": "https://aka.ms/teamsfx-env-config-schema",
  "description": "...",
  "manifest": {
    ...
  },
  // Add code below. Note you need to replace the placeholders with the values copied in previous steps.
  "auth": {
    "objectId": **Object ID**,
    "clientId": **Application (client) ID**,
    "clientSecret": {{ $env.AAD_APP_CLIENT_SECRET }},
    "accessAsUserScopeId": **Access As User Scope ID**
  }
  ```

1. Open Teams Toolkit extension and click on "Provision in the cloud". Wait until your project is successfully provisioned.


### Update permission for Azure AD app

* If Teams Toolkit failed to update permission, there will be an alert says:

  ```
  Failed in step: Update permission for Azure AD app. You need to go to Azure Protal and mannually update the permission under "API permissions" for the provided Azure AD app.
  ```

  Please follow the instruction to update permission if you see the above message.

1. Go to app's "API permissions" page, click "Add a permission" under "Configured permissions".

1. Choose the permissions you want to add and click on "Add permissions".

1. If the permission you added requires admin consent, you need to ask your tenant admin to consent the permission by click on "Grant admin consent for ${your-tenant}".


### Update redirect uri for Azure AD app

* If Teams Toolkit failed to update redirect uri, there will be an alert says:

  ```
  Failed in step: Update redirect uri for Azure AD app. You need to go to Azure Protal and mannually set "${redirectUri}" as "Redirect URIs" under "Authentication" for the provided Azure AD app.
  ```

  Please follow the instruction to update redirect uri if you see the above message.

1. Copy the **redirectUri** in the alert message. You will need it later.

2. Go to app's "Authentication" page, and click on Add a platform.
   * Select "Web".
   * **Redirect URIs**: Paste the **redirectUri** you copied just now.
   * **Front-channel logout URL**: Leave it empty.
   * **Implicit grant and hybrid flows**: Leave all unclicked.
   * Click on "Configure".

3. Click on "Save" to save the changes.


### Update application id uri for Azure AD app

* If Teams Toolkit failed to update application id uri, there will be an alert says:

  ```
  Failed in step: Update application id uri for Azure AD app. You need to go to Azure Protal and mannually set "${applicationIdUri}" as "Application ID URI" under "Expose an API" for the provided Azure AD app.
  ```

  Please follow the instruction to update application id uri if you see the above message.

1. Copy the **applicationIdUri** in the alert message. You will need it later.

1. Go to app's "Expose an API" page, and click on the "Edit" button beside "Application ID URI" above "Scopes defined by this API".
   * Paste the **applicationIdUri** you copied just now.
   * Click on "Save".