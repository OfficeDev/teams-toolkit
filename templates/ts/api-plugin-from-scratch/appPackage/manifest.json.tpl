{
  "$schema": "https://developer.microsoft.com/json-schemas/teams/vDevPreview/MicrosoftTeams.schema.json",
  "manifestVersion": "devPreview",
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
  "copilotExtensions": { 
    {{^DeclarativeCopilot}}   
    "plugins": [
      {
        "id": "plugin_1",
        "file": "ai-plugin.json"
      }
    ]
    {{/DeclarativeCopilot}}
    {{#DeclarativeCopilot}} 
    "declarativeCopilots": [
      {
        "id": "repairDeclarativeAgent",
        "file": "repairDeclarativeAgent.json"
      }
    ]
    {{/DeclarativeCopilot}} 
  },
  "permissions": [
    "identity",
    "messageTeamMembers"
  ]
}
