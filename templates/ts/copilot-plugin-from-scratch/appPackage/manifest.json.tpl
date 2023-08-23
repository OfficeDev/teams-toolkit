{    
    "manifestVersion": "devPreview",
    "id": "${{TEAMS_APP_ID}}",
    "version": "2.0.0",
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
            "composeExtensionType": "apiBased",
            "apiSpecificationFile": "apiSpecFiles/repair-openapi.yaml",
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