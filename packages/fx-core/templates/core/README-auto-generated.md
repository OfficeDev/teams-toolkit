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

### Option 1: Embed your existing web pages in Teams

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

### Option 2: Send Notification to Teams
// TODO

### Option 3: Build Command And Response
// TODO