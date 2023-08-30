{
    "$schema": "https://developer.microsoft.com/en-us/json-schemas/teams/v1.16/MicrosoftTeams.schema.json",
    "manifestVersion": "1.16",
    "version": "1.0.0",
    "id": "${{TEAMS_APP_ID}}",
    "packageName": "com.microsoft.teams.extension",
    "developer": {
        "name": "Teams App, Inc.",
        "websiteUrl": "https://www.example.com",
        "privacyUrl": "https://www.example.com/termofuse",
        "termsOfUseUrl": "https://www.example.com/privacy"
    },
    "icons": {
        "color": "color.png",
        "outline": "outline.png"
    },
    "name": {
        "short": "{{appName}}-${{TEAMSFX_ENV}}",
        "full": "full name for {{appName}}"
    },
    "description": {
        "short": "Easily search npm packages by name with our app.",
        "full": "Effortlessly search and discover npm packages by name using our app. Streamline your package exploration process with ease."
    },
    "accentColor": "#FFFFFF",
    "bots": [],
    "composeExtensions": [
        {
            "botId": "${{BOT_ID}}",
            "commands": [
                {
                    "id": "searchQuery",
                    "context": [
                        "compose",
                        "commandBox"
                    ],
                    "description": "Search for npm packages by name",
                    "title": "Search",
                    "type": "query",
                    "parameters": [
                        {
                            "name": "npmPackageName",
                            "title": "Npm package name for search",
                            "description": "Name of the npm package to be searched",
                            "inputType": "text"
                        }
                    ]
                }
            ]
        }
    ],
    "configurableTabs": [],
    "staticTabs": [],
    "permissions": [
        "identity",
        "messageTeamMembers"
    ],
    "validDomains": []
}