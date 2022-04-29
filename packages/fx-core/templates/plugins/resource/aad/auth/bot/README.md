# Enable SSO for bot project

Microsoft Teams has provided a mechanism to minimize the number of times users need to enter their sign in credentials and this is called single sign on. Teams Framework (TeamsFx) added support on top of this mechanism to help developers build single sign feature easily.

## Take a tour of project file structure change

After you successfully added SSO into your project, Teams Toolkit will create or modify some files that helps you implement SSO feature.

|Type| File | Purpose |
|-| - | - |
|Create| `aad.template.json` under `template\appPackage` | This is the Azure Active Directory application manifest used to represent your AAD app. This template will be used to register an AAD app during local debug or provision stage. |
|Modify | `manifest.template.json` under `template\appPackage` | An `webApplicationInfo` object will be added into your Teams app manifest template. This field is required by Teams when enabling SSO. This change will take effect when you trigger local debug or provision.|
|Create| `auth/bot` | reference code, auth redirect pages and a `README.md` file will be generated in this path for a bot project. |

## Update code to implement SSO feature

Teams Toolkit has created reference code that helps demonstrate how to implement SSO feature, please follow below instructions to update the code.

1. Copy `auth/bot/public` folder to `bot/src`. These folder contains HTML pages used for auth redirect, please note that you need to modify `bot/src/index` file to add routing to these pages.

1. Copy `auth/bot/sso` folder to `bot/src`.
These folder contains three files as reference for sso implementation:
    * `showUserInfo`: This implements a function to get user info with SSO token. You can follow this method and create your own method that requires SSO token.
    * `ssoDialog`: This creates a [ComponentDialog](https://docs.microsoft.com/en-us/javascript/api/botbuilder-dialogs/componentdialog?view=botbuilder-ts-latest) that used for SSO.
    * `teamsSsoBot`: This create a [TeamsActivityHandler](https://docs.microsoft.com/en-us/dotnet/api/microsoft.bot.builder.teams.teamsactivityhandler?view=botbuilder-dotnet-stable) with `ssoDialog` and add `showUserInfo` as a command that can be triggered. 

1. Register your own command with `addCommand` in this file.
1. Execute the following commands under `bot/`: `npm install isomorphic-fetch`
1. After adding the following files, you need to create a new `teamsSsoBot` instance in `bot/src/index` file. Please replace the following code:

    ```typescript
    // Process Teams activity with Bot Framework.
    server.post("/api/messages", async (req, res) => {
        await commandBot.requestHandler(req, res);
    });
    ```

    with:

    ```typescript
    const handler = new TeamsSsoBot();
    // Process Teams activity with Bot Framework.
    server.post("/api/messages", async (req, res) => {
        await commandBot.requestHandler(req, res, async (context)=> {
            await handler.run(context);
        });
    });
    ```

1. Add routing in `bot/src/index` file as below:

    ```typescript
    server.get(
        "/auth-*.html",
        restify.plugins.serveStatic({
            directory: path.join(__dirname, "public"),
        })
    );
    ```

## Debug your application

After you have updated the code, the SSO functionality should work. You can debug your application by pressing F5. At this stage, Teams Toolkit will use the AAD manifest file to register a AAD application used to achieve SSO. To learn more about Teams Toolkit local debug functionalities, please refer to this [documentation](https://docs.microsoft.com/microsoftteams/platform/toolkit/debug-local).

## Customize AAD applications

Teams Toolkit will create and update Azure Active Directory application with its [manifest](https://docs.microsoft.com/azure/active-directory/develop/reference-app-manifest) file. The manifest file contains a definition of all the attributes of an application object in the Microsoft identity platform. It also serves as a mechanism for updating the application object.

Follow this [documentation](https://aka.ms/teamsfx-aad-manifest#customize-aad-manifest-template) when you need to include additional API permissions with AAD manifest template used in Teams Toolkit.
