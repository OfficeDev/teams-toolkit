{
    "$schema": "https://developer.microsoft.com/en-us/json-schemas/teams/v1.17/MicrosoftTeams.schema.json",
    "manifestVersion": "1.17",
    "version": "1.0.0",
    "id": "${{TEAMS_APP_ID}}",
    "packageName": "com.microsoft.teams.extension",
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
        "short": "{{appName}}-${{TEAMSFX_ENV}}",
        "full": "Full name for {{appName}}"
    },
    "description": {
        "short": "Short description of {{appName}}",
        "full": "Full description of {{appName}}"
    },
    "accentColor": "#FFFFFF",
    "bots": [],
    "composeExtensions": [
        {
            "type": "apiBased",
            "apiSpecFile": "./apiSpecFiles/repair-openapi.yml",
            "supportsConversationAI": false,
            "commands": [
                {
                    "id": "repair",
                    "type": "query",
                    "context": [
                        "compose",
                        "commandBox"
                    ],
                    "title": "Returns a repair",
                    "description": "Returns a repair with its details and image",
                    "responseAdaptiveCardTemplate": "./adaptiveCards/repair.json"
                }
            ]
        }
    ],    
    "permissions": [
        "identity",
        "messageTeamMembers"
    ],
    "validDomains": [
        "*.example.com"
    ]
}