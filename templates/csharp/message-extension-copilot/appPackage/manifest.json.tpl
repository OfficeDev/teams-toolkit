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
        "short": "Find NuGet package according to the NuGet package name.",
        "full": "Find NuGet package according to the NuGet package name."
    },
    "accentColor": "#FFFFFF",
    "bots": [],
    "composeExtensions": [
        {
            "botId": "${{BOT_ID}}",
            "commands": [
                {
                    "id": "findNuGetPackage",
                    "context": [
                        "compose",
                        "commandBox"
                    ],
                    "description": "Find NuGet package according to the NuGet package name",
                    "title": "Find NuGet Package",
                    "type": "query",
                    "parameters": [
                        {
                            "name": "NuGetPackageName",
                            "title": "NuGet Package Name",
                            "description": "The name of the NuGet package to be searched",
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