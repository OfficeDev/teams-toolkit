{
  "profiles": {
{{#enableTestToolByDefault}}
    // Launch project within Teams App Test Tool
    "Teams App Test Tool (browser)": {
      "commandName": "Project",
      "launchTestTool": true,
      "launchUrl": "http://localhost:56150",
    },
{{/enableTestToolByDefault}}
    // Launch project within Teams
    "Microsoft Teams (browser)": {
      "commandName": "Project",
      "launchUrl": "https://teams.microsoft.com/l/app/${{TEAMS_APP_ID}}?installAppPackage=true&webjoin=true&appTenantId=${{TEAMS_APP_TENANT_ID}}&login_hint=${{TEAMSFX_M365_USER_NAME}}",
    },
{{^enableTestToolByDefault}}
    // Launch project within Teams App Test Tool
    "Teams App Test Tool (browser)": {
      "commandName": "Project",
      "launchTestTool": true,
      "launchUrl": "http://localhost:56150",
    },
{{/enableTestToolByDefault}}
  }
}