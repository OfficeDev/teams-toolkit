{
  "profiles": {
{{#enableTestToolByDefault}}
    // Debug project within Teams App Test Tool
    "Teams App Test Tool (browser)": {
      "commandName": "Project",
      "commandLineArgs": "host start --port 5130 --pause-on-error",
      "dotnetRunMessages": true,
      "launchBrowser": true,
      "launchTestTool": true,
      "launchUrl": "http://localhost:56150",
      "environmentVariables": {
        "ASPNETCORE_ENVIRONMENT": "TestTool",
        "TEAMSFX_NOTIFICATION_LOCALSTORE_DIR": "../../.." // Path to project folder $(MSBuildProjectDirectory)
      }
    },
{{/enableTestToolByDefault}}
    // Debug project within Teams
    "Microsoft Teams (browser)": {
      "commandName": "Project",
      "commandLineArgs": "host start --port 5130 --pause-on-error",
      "dotnetRunMessages": true,
      "launchBrowser": true,
      "launchUrl": "https://teams.microsoft.com/l/app/${{TEAMS_APP_ID}}?installAppPackage=true&webjoin=true&appTenantId=${{TEAMS_APP_TENANT_ID}}&login_hint=${{TEAMSFX_M365_USER_NAME}}",
      "environmentVariables": {
        "ASPNETCORE_ENVIRONMENT": "Development"
        "TEAMSFX_NOTIFICATION_LOCALSTORE_DIR": "../../.." // Path to project folder $(MSBuildProjectDirectory)
      }
    },
{{^enableTestToolByDefault}}
    // Debug project within Teams App Test Tool
    "Teams App Test Tool (browser)": {
      "commandName": "Project",
      "commandLineArgs": "host start --port 5130 --pause-on-error",
      "dotnetRunMessages": true,
      "launchBrowser": true,
      "launchTestTool": true,
      "launchUrl": "http://localhost:56150",
      "environmentVariables": {
        "ASPNETCORE_ENVIRONMENT": "TestTool",
        "TEAMSFX_NOTIFICATION_LOCALSTORE_DIR": "../../.." // Path to project folder $(MSBuildProjectDirectory)
      }
    },
{{/enableTestToolByDefault}}
    //// Uncomment following profile to debug project only (without launching Teams)
    //,
    //"Start Project (not in Teams)": {
    //  "commandName": "Project",
    //  "commandLineArgs": "host start --port 5130 --pause-on-error",
    //  "dotnetRunMessages": true,
    //  "environmentVariables": {
    //    "ASPNETCORE_ENVIRONMENT": "Development",
    //    "TEAMSFX_NOTIFICATION_LOCALSTORE_DIR": "../../.." // Path to project folder $(MSBuildProjectDirectory)
    //  }
    //}
  }
}