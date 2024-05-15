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
                    "description": "Find npm package according to the npm package name",
                    "title": "Find Npm Package",
                    "type": "query",
                    "semanticDescription": "This command retrieves detailed information about an npm package using the provided npm package name.",
                    "parameters": [
                        {
                            "name": "NpmPackageName",
                            "title": "Npm Package Name",
                            "description": "The name of the npm package to be searched",
                            "inputType": "text",
                            "semanticDescription": "This parameter is used to identify the specific npm package to be queried. Users should provide the exact name of the npm package they want to retrieve information for as the value of this parameter."
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