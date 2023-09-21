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
        "short": "Track and monitor car repair records for stress-free maintenance management.",
        "full": "The ultimate solution for hassle-free car maintenance management makes tracking and monitoring your car repair records a breeze. With the power of Copilot, you can effortlessly stay informed about your car's maintenance timeline."
    },
    "accentColor": "#FFFFFF",
    "composeExtensions": [
        {
            "composeExtensionType": "apiBased",
            "apiSpecificationFile": "apiSpecificationFiles/repair.yml",
            "commands": [
                {
                    "id": "repair",
                    "type": "query",
                    "title": "Search for repairs info",
                    "context": [
                        "compose",
                        "commandBox"
                    ],
                    "apiResponseRenderingTemplateFile": "responseTemplates/repair.json",
                    "parameters": [
                        {
                            "name": "assignedTo",
                            "title": "Assigned To",
                            "description": "Filter repairs by who they're assigned to",
                            "inputType": "text"
                        }
                    ]
                }
            ]
        }
    ],    
    "permissions": [
        "identity",
        "messageTeamMembers"
    ]
}