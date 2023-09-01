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
        "short": "Find npm package by name.",
        "full": "Find npm package according to the npm package name."
    },
    "accentColor": "#FFFFFF",
    "bots": [],
    "composeExtensions": [
        {
            "botId": "${{BOT_ID}}",
            "commands": [
                {
                    "id": "findNpmPackage",
                    "context": [
                        "compose",
                        "commandBox"
                    ],
                    "description": "Find Npm package according to the Npm package name",
                    "title": "Find Npm Package",
                    "type": "query",
                    "parameters": [
                        {
                            "name": "NpmPackageName",
                            "title": "Npm Package Name",
                            "description": "The Name of the npm package to be searched",
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