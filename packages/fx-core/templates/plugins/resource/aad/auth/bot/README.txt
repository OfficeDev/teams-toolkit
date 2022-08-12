# Enable single sign-on for bot applications

Microsoft Teams provides a mechanism by which an application can obtain the signed-in Teams user token to access Microsoft Graph (and other APIs). Teams Toolkit facilitates this interaction by abstracting some of the Azure Active Directory (AAD) flows and integrations behind some simple, high level APIs. This enables you to add single sign-on (SSO) features easily to your Teams application.

For a bot application, SSO manifests as an Adaptive Card which the user can interact with to invoke the AAD consent flow.

# Changes to your project

When you added the SSO feature to your application, Teams Toolkit updated your project to support SSO:

After you successfully added SSO into your project, Teams Toolkit will create and modify some files that helps you implement SSO feature.

| Action | File | Description |
| - | - | - |
| Create| `aad.template.json` under `templates/appPackage` | The Azure Active Directory application manifest that is used to register the application with AAD. |
| Modify | `manifest.template.json` under `templates/appPackage` | An `webApplicationInfo` object will be added into your Teams app manifest template. This field is required by Teams when enabling SSO. |
| Create | `auth/bot` | Reference code, redirect pages and a `README.md` file. These files are provided for reference. See below for more information. |

# Update your code to add SSO

As described above, the Teams Toolkit generated some configuration to set up your application for SSO, but you need to update your application business logic to take advantage of the SSO feature as appropriate.

> Note: The following part is for `command and response bot`. For `basic bot`, please refer to the [bot-sso sample](https://aka.ms/bot-sso-sample).

## Set up the AAD redirects

1. Move the `auth/bot/public` folder to `bot/src`. This folder contains HTML pages that the bot application hosts. When single sign-on flows are initiated with AAD, AAD will redirect the user to these pages.
2. Modify your `bot/src/index.ts` to add the appropriate `restify` routes to these pages.

## Update your business logic

The sample business logic provides a function `showUserInfo` that requires an AAD token to call Microsoft Graph. This token is obtained by using the logged-in Teams user token. The flow is brought together in a dialog that will display a consent dialog if required; otherwise it will go straight to `showUserInfo`.

To make this work in your application:

1. Move `auth/bot/public` folder to `bot/src`.
These folder contains HTML pages used for auth redirect, please note that you need to modify `bot/src/index` file to add routing to these pages.

1. Move `auth/bot/sso` folder to `bot/src`.
These folder contains three files as reference for sso implementation:
    * `showUserInfo`: This implements a function to get user info with SSO token. You can follow this method and create your own method that requires SSO token.
    * `ssoDialog`: This creates a [ComponentDialog](https://docs.microsoft.com/en-us/javascript/api/botbuilder-dialogs/componentdialog?view=botbuilder-ts-latest) that used for SSO.
    * `teamsSsoBot`: This create a [TeamsActivityHandler](https://docs.microsoft.com/en-us/javascript/api/botbuilder/teamsactivityhandler?view=botbuilder-ts-latest) with `ssoDialog` and add `showUserInfo` as a command that can be triggered. 

1. (Optional) Follow the code sample and register your own command with `addCommand` in this file.
1. Execute the following commands under `bot/`: `npm install isomorphic-fetch`
1. (For ts only) Execute the following commands under `bot/`: `npm install copyfiles` and replace following line in package.json:
    ```
    "tsc --build && shx cp -r ./src/adaptiveCards ./lib/src",
    ```
    with:
    ```
    "tsc --build && shx cp -r ./src/adaptiveCards ./lib/src && copyfiles src/public/*.html lib/",
    ```
    By doing this, the HTML pages used for auth redirect will be copied when building this bot project.

1. After adding the following files, you need to create a new `teamsSsoBot` instance in `bot/src/index` file. 
Please replace the following code:
    ```
    // Process Teams activity with Bot Framework.
    server.post("/api/messages", async (req, res) => {
        await commandBot.requestHandler(req, res);
    });
    ```

    with:

    ```
    const handler = new TeamsSsoBot();
    // Process Teams activity with Bot Framework.
    server.post("/api/messages", async (req, res) => {
        await commandBot.requestHandler(req, res, async (context)=> {
            await handler.run(context);
        })
        .catch((err) => {
            // Error message including "412" means it is waiting for user's consent, which is a normal process of SSO, sholdn't throw this error.
            if (!err.message.includes("412")) {
                throw err;
            }
        });
    });
    ```

1. Add routing in `bot/src/index` file as below:

    ```
    server.get(
        "/auth-*.html",
        restify.plugins.serveStatic({
            directory: path.join(__dirname, "public"),
        })
    );
    ```

1. Add the following lines to `bot/src/index` to import `teamsSsoBot` and `path`:

    ```
    // For ts:
    import { TeamsSsoBot } from "./sso/teamsSsoBot";
    const path = require("path");

    // For js:
    const { TeamsSsoBot } = require("./sso/teamsSsoBot");
    const path = require("path");
    ```

1. Register your command in the Teams app manifest. Open `templates/appPackage/manifest.template.json`, and add following lines under `command` in `commandLists` of your bot:

    ```
    {
        "title": "show",
        "description": "Show user profile using Single Sign On feature"
    }
    ```

## (Optional) Add a new command to the bot

After successfully add SSO in your project, you can also add a new command.

1. Create a new file (e.g. `todo.ts` or `todo.js`) under `bot/src/` and add your own business logic to call Graph API:

    ```TypeScript
    // for TypeScript:
    export async function showUserImage(
        context: TurnContext,
        ssoToken: string,
        param: any[]
    ): Promise<DialogTurnResult> {
        await context.sendActivity("Retrieving user photo from Microsoft Graph ...");

        // Init TeamsFx instance with SSO token
        const teamsfx = new TeamsFx().setSsoToken(ssoToken);

        // Update scope here. For example: Mail.Read, etc.
        const graphClient = createMicrosoftGraphClient(teamsfx, param[0]);
        
        // You can add following code to get your photo:
        // let photoUrl = "";
        // try {
        //   const photo = await graphClient.api("/me/photo/$value").get();
        //   const arrayBuffer = await photo.arrayBuffer();
        //   const buffer=Buffer.from(arrayBuffer, 'binary');
        //   photoUrl = "data:image/png;base64," + buffer.toString("base64");
        // } catch {
        //   // Could not fetch photo from user's profile, return empty string as placeholder.
        // }
        // if (photoUrl) {
        //   await context.sendActivity(
        //     `You can find your photo here: ${photoUrl}`
        //   );
        // } else {
        //   await context.sendActivity("Could not retrieve your photo from Microsoft Graph. Please make sure you have uploaded your photo.");
        // }

        return;
    }
    ```

    ```javascript
    // for JavaScript:
    async function showUserImage(context, ssoToken, param) {
        await context.sendActivity("Retrieving user photo from Microsoft Graph ...");
    
        // Init TeamsFx instance with SSO token
        const teamsfx = new TeamsFx().setSsoToken(ssoToken);
    
        // Update scope here. For example: Mail.Read, etc.
        const graphClient = createMicrosoftGraphClient(teamsfx, param[0]);
        
        // You can add following code to get your photo:
        // let photoUrl = "";
        // try {
        //   const photo = await graphClient.api("/me/photo/$value").get();
        //   const arrayBuffer = await photo.arrayBuffer();
        //   const buffer=Buffer.from(arrayBuffer, 'binary');
        //   photoUrl = "data:image/png;base64," + buffer.toString("base64");
        // } catch {
        //   // Could not fetch photo from user's profile, return empty string as placeholder.
        // }
        // if (photoUrl) {
        //   await context.sendActivity(
        //     `You can find your photo here: ${photoUrl}`
        //   );
        // } else {
        //   await context.sendActivity("Could not retrieve your photo from Microsoft Graph. Please make sure you have uploaded your photo.");
        // }
    
        return;
    }

    module.exports = {
      showUserImage,
    };
    ```

1. Register a new command using `addCommand` in `teamsSsoBot`:

    Find the following line:

    ```
    this.dialog.addCommand("ShowUserProfile", "show", showUserInfo);
    ```

    and add following lines after the above line to register a new command `photo` and hook up with method `showUserImage` added above:

    ```
    // As shown here, you can add your own parameter into the `showUserImage` method
    // You can also use regular expression for the command here
    const scope = ["User.Read"];
    this.dialog.addCommand("ShowUserPhoto", new RegExp("photo\s*.*"), showUserImage, scope);
    ```

1. Register your command in the Teams app manifest. Open 'templates/appPackage/manifest.template.json', and add following lines under `command` in `commandLists` of your bot:

    ```
    {
        "title": "photo",
        "description": "Show user photo using Single Sign On feature"
    }
    ```

# Debug your application

You can debug your application by pressing F5.

Teams Toolkit will use the AAD manifest file to register a AAD application registered for SSO.

To learn more about Teams Toolkit local debug functionalities, refer to this [document](https://docs.microsoft.com/microsoftteams/platform/toolkit/debug-local).

# Customize AAD applications

The AAD [manifest](https://docs.microsoft.com/azure/active-directory/develop/reference-app-manifest) allows you to customize various aspects of your application registration. You can update the manifest as needed.

Follow this [document](https://aka.ms/teamsfx-aad-manifest#customize-aad-manifest-template) if you need to include additional API permissions to access your desired APIs.

Follow this [document](https://aka.ms/teamsfx-aad-manifest#How-to-view-the-AAD-app-on-the-Azure-portal) to view your AAD application in Azure Portal.
