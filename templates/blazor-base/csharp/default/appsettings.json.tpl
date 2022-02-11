{
  "Logging": {
    "LogLevel": {
      "Default": "Information",
      "Microsoft": "Warning",
      "Microsoft.Hosting.Lifetime": "Information"
    }
  },
  "AllowedHosts": "*"{{#IS_TAB}},
  "TeamsFx": {
    "Authentication": {
      "ClientId": "$clientId$",
      "ClientSecret": "$client-secret$",
      "InitiateLoginEndpoint": "$appEndPoint$auth-start.html",
      "OAuthAuthority": "$oauthAuthority$"
    }
  }{{/IS_TAB}}{{#IS_BOT}},
  "BOT_ID": "$botId$",
  "BOT_PASSWORD": "$bot-password$"
{{/IS_BOT}}
}