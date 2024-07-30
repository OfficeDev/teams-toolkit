{
    "$schema": "https://developer.microsoft.com/json-schemas/teams/vDevPreview/MicrosoftTeams.schema.json",
    "manifestVersion": "devPreview",
    "version": "1.0.0",
    "id": "${{TEAMS_APP_ID}}",
    "developer": {
        "name": "Teams App, Inc.",
        "websiteUrl": "https://www.example.com",
        "privacyUrl": "https://www.example.com/privacy",
        "termsOfUseUrl": "https://www.example.com/termofuse"
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
        "short": "Short description for {{appName}}",
        "full": "Full description for {{appName}}"
    },
    "accentColor": "#FFFFFF",
    {{#DeclarativeCopilot}}
    "copilotExtensions": {
        "declarativeCopilots": [            
            {
                "id": "declarativeCopilot",
                "file": "declarativeCopilot.json"
            }
        ]
    },
    {{/DeclarativeCopilot}}
    "permissions": [
        "identity",
        "messageTeamMembers"
    ],
    "validDomains": []
}