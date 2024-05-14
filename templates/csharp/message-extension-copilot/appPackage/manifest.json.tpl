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
                    "semanticDescription": "This command retrieves detailed information about a NuGet package using the provided NuGet package name.",
                    "parameters": [
                        {
                            "name": "NuGetPackageName",
                            "title": "NuGet Package Name",
                            "description": "The name of the NuGet package to be searched",
                            "inputType": "text",
                            "semanticDescription": "This parameter is used to identify the specific NuGet package to be queried. Users should provide the exact name of the NuGet package they want to retrieve information for as the value of this parameter."
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