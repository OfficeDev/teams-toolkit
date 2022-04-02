## How to enable SSO in TeamsFx Tab projects

This doc will show you how to add Single Sign On feature to TeamsFx Tab projects. Note that this article is only for Teams Toolkit Visual Studio Code Extension version after x.x.x or TeamsFx CLI version after x.x.x.

*Note: This article is only for TeamsFx projects by Javascript and Typescript. For Dotnet, please refer to ${help link}.*

### Step 1: Enable Single Sign On with TeamsFx commands

You can follow the following steps to add SSO feature to your TeamsFx projects.
- From Visual Studio Code: open the command palette and select: `Teams: Add SSO`.
- From TeamsFx CLI: run command `teamsfx add sso` in your project directory.

What TeamsFx will do when trigger this command:

1. Create Azure AD app template under `template\appPackage\aad.template.json`

1. Add `webApplicationInfo` object in Teams App manifest

1. Create `README.md` and sample code under `auth/tab/`

### Step 2: Update your source code

There are two folders under `auth/tab`: `public` and `sso`.

1. In `public`, there are two html files which is used for authentication. You can simply copy the files under the folder and place it under `tabs/public/`.

2. In `sso`, there is one file. You can simply copy the folder and place it under `tabs/src/sso/`.
    - `GetUserProfile`: This file implement a function that calls Microsoft Graph API to get user info.
    - You need to manually run the following commands under `tabs/`:
        ```
        npm install @microsoft/teamsfx-react
        ```
    - You need to manually add the following lines to `tabs/src/components/sample/Welcome.tsx` to import `GetUserProfile`:

        ```
        import { GetUserProfile } from "../sso/GetUserProfile";
        ```
        and replace the following line:
        ```
        <AddSSO />
        ```
        with:
        ```
        <GetUserProfile />
        ```

### Step 3: Provision Azure AD app and deploy latest code

After running `add sso` command and updating source code, you need to run `Provision` + `Deploy` or `Local Debug` again to provision an Azure AD app for Single Sign On. After the above steps, Single Sign On is successfully added in your Teams App.