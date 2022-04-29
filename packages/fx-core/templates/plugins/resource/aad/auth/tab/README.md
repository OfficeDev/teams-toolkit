# Enable SSO for tab project

Microsoft Teams has provided a mechanism to minimize the number of times users need to enter their sign in credentials and this is called single sign on. Teams Framework (TeamsFx) added support on top of this mechanism to help developers build single sign feature easily.

## Take a tour of project file structure change

After you successfully added SSO into your project, Teams Toolkit will create or modify some files that helps you implement SSO feature.

|Type| File | Purpose |
|-| - | - |
|Create| `aad.template.json` under `template\appPackage` | This is the Azure Active Directory application manifest used to represent your AAD app. This template will be used to register an AAD app during local debug or provision stage. |
|Modify | `manifest.template.json` under `template\appPackage` | An `webApplicationInfo` object will be added into your Teams app manifest template. This field is required by Teams when enabling SSO. This change will take effect when you trigger local debug or provision.|
|Create| `auth/tab` | reference code, auth redirect pages and a `README.md` file will be generated in this path for a tab project. |

## Update code to implement SSO feature

Teams Toolkit has created reference code that helps demonstrate how to implement SSO feature, please follow below instructions to update the code.

1. Copy `auth-start.html` and `auth-end.htm` in `auth/public` folder to `tabs/public/`.
These two HTML files are used for auth redirects.

1. Copy `sso` folder under `asuth/tab` to `tabs/src/sso/`.
`GetUserProfile`: This file implements a function that calls Microsoft Graph API to get user info.

1. Execute the following commands under `tabs/`: `npm install @microsoft/teamsfx-react`
1. Add the following lines to `tabs/src/components/sample/Welcome.tsx` to import `GetUserProfile`:
        ```
        import { GetUserProfile } from "../../sso/GetUserProfile";
        ```
1. Replace the following line: `<AddSSO />` with `<GetUserProfile />`.

## Debug your application

After you have updated the code, the SSO functionality should work. You can debug your application by pressing F5. At this stage, Teams Toolkit will use the AAD manifest file to register a AAD application used to achieve SSO. To learn more about Teams Toolkit local debug functionalities, please refer to this [documentation](https://docs.microsoft.com/microsoftteams/platform/toolkit/debug-local).

## Customize AAD applications

Teams Toolkit will create and update Azure Active Directory application with its [manifest](https://docs.microsoft.com/azure/active-directory/develop/reference-app-manifest) file. The manifest file contains a definition of all the attributes of an application object in the Microsoft identity platform. It also serves as a mechanism for updating the application object.

Follow this [documentation](https://aka.ms/teamsfx-aad-manifest#customize-aad-manifest-template) when you need to include additional API permissions with AAD manifest template used in Teams Toolkit.
