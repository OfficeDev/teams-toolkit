# TeamsFx Project

## Project folder structure

After initializing the project, you can view the project folders and files in the explorer area of Visual Studio Code. These files are used by Teams Toolkit to maintain the config and template of the app:

* `.fx/configs`: configure files that user can customize for the Teams app.
  * `config.local.json`: configuration file for local debug/preview.
  * `config.dev.json`: configuration file for development environment.
  * `projectSettings.json`: global project settings , which apply to all environments.
* `templates/appPackage`
  * `manifest.template.json`: app manifest template file.
  * `resources`: app's icon referenced by manifest template file.

## Next Steps

Now, you're able to build a Teams app with Teams Toolkit. However, as the Teams app is still an empty app, nothing would be happened after installed the Teams app. To continue development, you have below options.

### Option 1: Add components
// TODO

### Option 2: Integrate with existing app

To integrate with existing app, you need to figure out what kind of Teams app you want to build with existing application. There're two supported types:
1. [Teams Tab app](https://docs.microsoft.com/en-us/microsoftteams/platform/tabs/what-are-tabs).
2. [Teams Bot app](https://docs.microsoft.com/en-us/microsoftteams/platform/bots/what-are-bots).

#### Build Tab app with existing app

* Step 1: launch your existing app, and get the exposed public endpoint.
* Step 2: define variables with above endpoint inside the config file.

  Here's an example of `config.local.json`:
  ```json
  {
    ...
    "manifest": {
      ...
      "developerWebsiteUrl": "https://localhost:3000",
      "developerPrivacyUrl": "https://localhost:3000",
      "developerTermsOfUseUrl": "https://localhost:3000",
      "tabContentUrl": "https://localhost:3000",
      "tabWebsiteUrl": "https://localhost:3000"
      ...
    }
    ...
  }
  ```
* Step 3: insert the tab app definition and update Teams app manifest template with above variables.

  ```json
  {
    ...
    "developer": {
        "name": "Teams App, Inc.",
        "websiteUrl": "{{{config.manifest.developerWebsiteUrl}}}",
        "privacyUrl": "{{{config.manifest.developerPrivacyUrl}}}",
        "termsOfUseUrl": "{{{config.manifest.developerTermsOfUseUrl}}}"
    },
    ...
    "staticTabs": [
      {
        "entityId": "index",
        "name": "Personal Tab",
        "contentUrl": "{{{config.manifest.tabContentUrl}}}",
        "websiteUrl": "{{{config.manifest.tabWebsiteUrl}}}",
        "scopes": [
          "personal"
        ]
      }
    ],
    ...
  }
  ```

After above 3 steps, the Tab app integrated with existing app is ready. Now you could preview your Teams app via the Environment section in the sidebar.

Notes:
* The endpoint of your existing application must be HTTPS secured.
* Remote environments (e.g. `dev`) need to be provisioned first before preview. The provision step will help to register a Teams app with your M365 account.

#### Build Bot app with existing app

* Step 1: prepare the existing bot id.
* Step 2: define key value pairs inside the config file.

  Here's an example of `config.local.json`:
  ```json
  {
    ...
    "manifest": {
      ...
      "botId": "00000000-0000-0000-0000-000000000000"
    }
    ...
  }
  ```
* Step 3: insert the bot app definition and update Teams app manifest template with above keys.

  ```json
  {
    ...
    "bots": [
      {
        "botId": "{{config.manifest.botId}}",
        // you could customize the bot app's scopes.
        "scopes": [
          "personal",
          "team",
          "groupchat"
        ]
      }
    ],
    ...
  }
  ```

After above 3 steps, the Bot app integrated with existing app is ready. Now you could preview your Teams app via the Environment section in the sidebar.

Notes:
* Remote environments (e.g. `dev`) need to be provisioned first before preview. The provision step will help to register a Teams app with your M365 account.