  # Create or reuse an existing Microsoft Entra application for bot.
  - uses: botAadApp/create
    with:
      # The Microsoft Entra application's display name
      name: ${{CONFIG__MANIFEST__APPNAME__SHORT}}-bot
    writeToEnvironmentFile:
      # The Microsoft Entra application's client id created for bot.
      botId: BOT_ID
      # The Microsoft Entra application's client secret created for bot.
      botPassword: SECRET_BOT_PASSWORD