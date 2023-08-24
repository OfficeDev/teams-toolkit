{
    "$schema": "https://raw.githubusercontent.com/OfficeDev/microsoft-teams-app-schema/preview/DevPreview/MicrosoftTeams.schema.json",
    "manifestVersion": "devPreview",
    "id": "${{TEAMS_APP_ID}}",
    "packageName": "com.microsoft.teams.extension",
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
        "short": "{{appName}}-${{TEAMSFX_ENV}}",
        "full": "Full name for {{appName}}"
    },
    "description": {
        "short": "Short description of {{appName}}",
        "full": "Full description of {{appName}}"
    },
    "accentColor": "#FFFFFF",
    "composeExtensions": [
        {
            "type": "apiBased",
            "apiSpecificationFile": "apiSpecFiles/repair-openapi.yaml",
            "commands": [
                {
                    "id": "repair",
                    "type": "query",
                    "title": "Returns a repair",
                    "context": [
                        "compose",
                        "commandBox"
                    ],
                    "apiResponseRenderingTemplateFile": "adaptiveCards/repair.json"
                }
            ],
            "supportsConversationalAI": true
        }
    ],    
    "permissions": [
        "identity",
        "messageTeamMembers"
    ]
}