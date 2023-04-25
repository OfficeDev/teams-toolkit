  - uses: teamsApp/create # Creates a Teams app
    with:
      name: ${{CONFIG__MANIFEST__APPNAME__SHORT}} # Teams app name
    writeToEnvironmentFile:
      # Write the information of created resources into environment file for the specified environment variable(s).
      teamsAppId: TEAMS_APP_ID