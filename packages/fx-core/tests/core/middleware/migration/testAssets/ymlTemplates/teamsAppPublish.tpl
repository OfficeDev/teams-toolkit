  - uses: teamsApp/publishAppPackage # Publish the app to Teams Admin Center (https://admin.teams.microsoft.com/policies/manage-apps) for review and approval
    with:
      appPackagePath: ./build/appPackage/appPackage.${{TEAMSFX_ENV}}.zip
    writeToEnvironmentFile:
      # Write the information of created resources into environment file for the specified environment variable(s).
      publishedAppId: TEAMS_APP_PUBLISHED_APP_ID