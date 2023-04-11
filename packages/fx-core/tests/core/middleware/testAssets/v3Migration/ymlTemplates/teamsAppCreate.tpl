  - uses: teamsApp/create # Creates a Teams app
    with:
      name: ${{CONFIG__MANIFEST__APPNAME__SHORT}} # Teams app name
    writeToEnvironmentFile:
      teamsAppId: TEAMS_APP_ID