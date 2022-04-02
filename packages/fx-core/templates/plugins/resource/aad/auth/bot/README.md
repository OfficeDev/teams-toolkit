## How to enable SSO in TeamsFx Bot projects

This doc will show you how to add Single Sign On feature to TeamsFx Bot projects. Note that this article is only for Teams Toolkit Visual Studio Code Extension version after x.x.x or TeamsFx CLI version after x.x.x.

*Note: This article is only for bot hosted on Azure App Service. Bot that hosted on Azure Function is not supported now.*

*Note: This article is only for TeamsFx projects by Javascript and Typescript. For Dotnet, please refer to ${help link}.*

### Step 1: Enable Single Sign On with TeamsFx commands

You can follow the following steps to add SSO feature to your TeamsFx projects.
- From Visual Studio Code: open the command palette and select: `Teams: Add SSO`.
- From TeamsFx CLI: run command `teamsfx add sso` in your project directory.

What TeamsFx will do when trigger this command:

1. Create Azure AD app template under `template\appPackage\aad.template.json`

1. Add `webApplicationInfo` object in Teams App manifest

1. Create `README.md` and sample code under `auth/bot/`

### Step 2: Update your source code

There are two folders under `auth/bot`: `public` and `sso`.

1. In `public`, there are two html files which is used for authentication. You can simply copy the folder and place it under `bot/src`. Note that you need to modify `bot/src/index` file to add routing to these pages.

1. In `sso`, there are three files. You can simply copy the folder and place it under `bot/src`.
    - `showUserInfo`: This file implement a function to get user info with SSO token. You can follow this method and create your own method that requires SSO token.
    - `ssoDialog`: Create a [ComponentDialog](https://docs.microsoft.com/en-us/javascript/api/botbuilder-dialogs/componentdialog?view=botbuilder-ts-latest) that used for Single Sign On.
    - `teamsSsoBot`: Create a [TeamsActivityHandler](https://docs.microsoft.com/en-us/dotnet/api/microsoft.bot.builder.teams.teamsactivityhandler?view=botbuilder-dotnet-stable) with `ssoDialog` and add `showUserInfo` as a command that can be triggered. You need to register your own command with `addCommand` in this file.

1. After adding the following files, you need to new a `teamsSsoBot` instance in `bot/src/index` file with:

    ```
    const handler = new TeamsSsoBot();
    server.post("/api/messages", async (req, res) => {
        await adapter.processActivity(req, res, async (context) => {
            await handler.run(context);
        }).catch((err) => {
            // Error message including "412" means it is waiting for user's consent, which is a normal process of SSO, sholdn't throw this error.
            if (!err.message.includes("412")) {
                throw err;
            }
        });
    });
    ```

1. As mentioned above, you also need to add routing in `bot/src/index` file as below:

    ```
    server.get(
        "/auth-*.html",
        restify.plugins.serveStatic({
            directory: path.join(__dirname, "public"),
        })
    );
    ```

### Step 3: Provision Azure AD app and deploy latest code

After running `add sso` command and updating source code, you need to run `Provision` + `Deploy` or `Local Debug` again to provision an Azure AD app for Single Sign On. After the above steps, Single Sign On is successfully added in your Teams App.