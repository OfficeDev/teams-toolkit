  # Creates a Teams app
  - uses: teamsApp/create
    with:
      # Teams app name
      name: ${{CONFIG__MANIFEST__APPNAME__SHORT}}
    # Write the information of created resources into environment file for
    # the specified environment variable(s).
    writeToEnvironmentFile:
      teamsAppId: TEAMS_APP_ID