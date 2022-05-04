# Enable single sign-on for tab applications

Microsoft Teams provides a mechanism by which an application can obtain the signed-in Teams user token to access Microsoft Graph (and other APIs). Teams Toolkit faciliates this interaction by abstracting some of the Azure Active Directory flows and integrations behind some simple, high level APIs. This enalbes you to add single sign-on (SSO) features easily to your Teams application.

# Changes to your project

When you added the SSO feature to your application, Teams Toolkit updated your project to support SSO:

After you successfully added SSO into your project, Teams Toolkit will create and modify some files that helps you implement SSO feature.

| Action | File | Description |
| - | - | - |
| Create| `aad.template.json` under `template\appPackage` | The Azure Active Directory application manifest that is used to register the application with AAD. |
| Modify | `manifest.template.json` under `template\appPackage` | An `webApplicationInfo` object will be added into your Teams app manifest template. This field is required by Teams when enabling SSO. |
| Create | `auth/tabs` | Reference code, redirect pages and a `README.md` file. These files are provided for reference. See below for more information. |

# Update your code to add SSO

As described above, the Teams Toolkit generated some configuration to set up your application for SSO, but you need to update your application business logic to take advantage of the SSO feature as appropriate.

1. Copy the `auth/tabs/public` folder to `tabs/public`. This folder contains HTML pages that are used for AAD redirects.
2. Copy the `auth/tabs/sso` folder to `tabs/src/sso`. This folder contains:
     * `GetUserProfile`: This file implements a function that retrieves user information from Microsoft Graph.
3. In the `tabs` folder, run this command: `npm install @microsoft/teamsfx-react`
4. Add the following lines to `tabs/src/components/sample/Welcome.tsx` to import `GetUserProfile`:
     ```
     import { GetUserProfile } from "../../sso/GetUserProfile";
     ```
5. Replace the following line: `<AddSSO />` with `<GetUserProfile />`.

# Debug your application

You can debug your application by pressing F5.

Teams Toolkit will use the AAD manifest file to register a AAD application registered for SSO.

To learn more about Teams Toolkit local debug functionalities, refer to this [document](https://docs.microsoft.com/microsoftteams/platform/toolkit/debug-local).

# Customize AAD applications

The AAD [manifest](https://docs.microsoft.com/azure/active-directory/develop/reference-app-manifest) allows you to customize various aspects of your application registration. You can update the manifest as needed.

Follow this [document](https://aka.ms/teamsfx-aad-manifest#customize-aad-manifest-template) if you need to include additional API permissions to access your desired APIs.
