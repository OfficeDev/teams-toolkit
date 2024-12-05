{
  "profiles": {
    // Launch project within Teams
    "Microsoft Teams (browser)": {
      "commandName": "Project",
      "launchUrl": "https://teams.microsoft.com/l/app/${{TEAMS_APP_ID}}?installAppPackage=true&webjoin=true&appTenantId=${{TEAMS_APP_TENANT_ID}}&login_hint=${{TEAMSFX_M365_USER_NAME}}",
    },
{{#CEAEnabled}}
    // Launch project within M365 Copilot
    "Microsoft 365 Copilot (browser)": {
      "commandName": "Project",
      "launchUrl": "https://www.office.com/chat?auth=2&&login_hint=${{TEAMSFX_M365_USER_NAME}}"
    },
{{/CEAEnabled}}
  }
}