# Enable single sign-on for bot applications

Microsoft Teams provides a mechanism by which an application can obtain the signed-in Teams user token to access Microsoft Graph (and other APIs). Teams Toolkit faciliates this interaction by abstracting some of the Azure Active Directory (AAD) flows and integrations behind some simple, high level APIs. This enalbes you to add single sign-on (SSO) features easily to your Teams application.

For a bot application, SSO manifests as an Adaptive Card which the user can interact with to invoke the AAD consent flow.

# Changes to your project

When you added the SSO feature to your application, Teams Toolkit updated your project to support SSO:

After you successfully added SSO into your project, Teams Toolkit will create and modify some files that helps you implement SSO feature.

| Action | File | Description |
| - | - | - |
| Create| `aad.template.json` under `template\appPackage` | The Azure Active Directory application manifest that is used to register the application with AAD. |
| Modify | `manifest.template.json` under `template\appPackage` | An `webApplicationInfo` object will be added into your Teams app manifest template. This field is required by Teams when enabling SSO. |
| Create | `auth/bot` | Reference code, redirect pages and a `README.md` file. These files are provided for reference. See below for more information. |

# Update your code to add SSO

As described above, the Teams Toolkit generated some configuration to set up your application for SSO, but you need to update your application business logic to take advantage of the SSO feature as appropriate.

## Set up the AAD redirects

1. Copy the `auth/bot/public` folder to `bot/src`. This folder contains HTML pages that the bot application hosts. When single sign-on flows are initiated with AAD, AAD will redirect the user to these pages.
2. Modify your `bot/src/index.ts` to add the appropriate `restify` routes to these pages.

## Update your business logic

The sample business logic provides a function `showUserInfo` that requires an AAD token to call Microsoft Graph. This token is obtained by using the logged-in Teams user token. The flow is brought together in a dialog that will display a consent dialog if required; otherwise it will go straight to `showUserInfo`.

To make this work in your application:

1. Copy the `auth/bot/sso` folder to `bot/src`. This folder contains three files that provide a default SSO implementation:
    * `showUserInfo`: This default sample retrieves user information from Microsoft Graph.
    * `ssoDialog`: This creates a [ComponentDialog](https://docs.microsoft.com/en-us/javascript/api/botbuilder-dialogs/componentdialog?view=botbuilder-ts-latest) that implements the SSO flow.
    * `teamsSsoBot`: This create a [TeamsActivityHandler](https://docs.microsoft.com/en-us/dotnet/api/microsoft.bot.builder.teams.teamsactivityhandler?view=botbuilder-dotnet-stable) with `showUserInfo` as a command. The `ssoDialog` is displayed if needed.
2. In `src/internal/initialize.ts`, register your command with `addCommand`.
3. In the `bot` folder, run this command: `npm install isomorphic-fetch`
4. Create a new `teamsSsoBot` instance in your `bot/src/index.ts` file.
5. Replace the following code:

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

6. Add the following route to `bot/src/index.ts`:

    ```typescript
    server.get(
        "/auth-*.html",
        restify.plugins.serveStatic({
            directory: path.join(__dirname, "public"),
        })
    );
    ```

# Debug your application

You can debug your application by pressing F5.

Teams Toolkit will use the AAD manifest file to register a AAD application registered for SSO.

To learn more about Teams Toolkit local debug functionalities, refer to this [document](https://docs.microsoft.com/microsoftteams/platform/toolkit/debug-local).

# Customize AAD applications

The AAD [manifest](https://docs.microsoft.com/azure/active-directory/develop/reference-app-manifest) allows you to customize various aspects of your application registration. You can update the manifest as needed.

Follow this [document](https://aka.ms/teamsfx-aad-manifest#customize-aad-manifest-template) if you need to include additional API permissions to access your desired APIs.
