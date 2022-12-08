{
  "profiles": {
    // Debug project within Teams
    "Microsoft Teams (browser)": {
      "commandName": "Project",
      "dotnetRunMessages": true,
      "launchBrowser": true,
      "launchUrl": "https://teams.microsoft.com/l/app/%TEAMSAPPID%?installAppPackage=true&webjoin=true&appTenantId=%TENANTID%&login_hint=%USERNAME%",
      "applicationUrl": "https://localhost:44302;http://localhost:2544",
      "environmentVariables": {
        "ASPNETCORE_ENVIRONMENT": "Development"
      },
      "hotReloadProfile": "aspnetcore"
    },
    // Debug project only (without launching Teams)
    "{%ProjectName%}": {
      "commandName": "Project",
      "dotnetRunMessages": true,
      "launchBrowser": true,
      "applicationUrl": "https://localhost:44302;http://localhost:2544",
      "environmentVariables": {
        "ASPNETCORE_ENVIRONMENT": "Development"
      },
      "hotReloadProfile": "aspnetcore"
    }
  }
}