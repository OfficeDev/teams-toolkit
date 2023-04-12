  - uses: botAadApp/create # Creates a new AAD app for Bot Registration.
    with:
      name: testProjectbt${{RESOURCE_SUFFIX}}
    writeToEnvironmentFile:
      botId: BOT_ID
      botPassword: SECRET_BOT_PASSWORD