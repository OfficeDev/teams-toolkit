{
  "$schema": "https://developer.microsoft.com/json-schemas/teams/v1.19/MicrosoftTeams.schema.json",
  "manifestVersion": "1.19",
  "id": "${{TEAMS_APP_ID}}",
  "version": "1.0.0",
  "developer": {
    "name": "Teams App, Inc.",
    "websiteUrl": "https://www.example.com",
    "privacyUrl": "https://www.example.com/privacy",
    "termsOfUseUrl": "https://www.example.com/termsofuse"
  },
  "icons": {
    "color": "color.png",
    "outline": "outline.png"
  },
  "name": {
    "short": "{{appName}}${{APP_NAME_SUFFIX}}",
    "full": "Full name for {{appName}}"
  },
  "description": {
    "short": "Track and monitor car repair records for stress-free maintenance management.",
    "full": "The ultimate solution for hassle-free car maintenance management makes tracking and monitoring your car repair records a breeze."
  },
  "accentColor": "#FFFFFF",
  "copilotAgents": {    
    "plugins": [
      {
        "id": "plugin_1",
        "file": "ai-plugin.${{TEAMSFX_ENV}}.json"
      }
    ]
  },
  "permissions": [
    "identity",
    "messageTeamMembers"
  ]
}
