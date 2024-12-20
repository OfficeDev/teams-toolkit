{{^DeclarativeCopilot}}
{
    "version": "0.2.0",
    "configurations": [
        {
            "name": "Preview in the Microsoft 365 app (Edge)",
            "type": "msedge",
            "request": "launch",
            "url": "https://www.office.com/chat?auth=2",
            "presentation": {
                "group": "group 1: the Microsoft 365 app",
                "order": 1
            },
            "internalConsoleOptions": "neverOpen"
        },
        {
            "name": "Preview in the Microsoft 365 app (Chrome)",
            "type": "chrome",
            "request": "launch",
            "url": "https://www.office.com/chat?auth=2",
            "presentation": {
                "group": "group 1: the Microsoft 365 app",
                "order": 2
            },
            "internalConsoleOptions": "neverOpen"
        },
        {
            "name": "Preview in Teams (Edge)",
            "type": "msedge",
            "request": "launch",
            "url": "https://teams.microsoft.com?${account-hint}",
            "presentation": {
                "group": "group 2: Teams",
                "order": 1
            },
            "internalConsoleOptions": "neverOpen"
        },
        {
            "name": "Preview in Teams (Chrome)",
            "type": "chrome",
            "request": "launch",
            "url": "https://teams.microsoft.com?${account-hint}",
            "presentation": {
                "group": "group 2: Teams",
                "order": 2
            },
            "internalConsoleOptions": "neverOpen"
        }
    ]
}
{{/DeclarativeCopilot}}
{{#DeclarativeCopilot}}
{
    "version": "0.2.0",
    "configurations": [
        {
            "name": "Preview in Copilot (Edge)",
            "type": "msedge",
            "request": "launch",
            "url": "https://m365.cloud.microsoft/chat/entity1-d870f6cd-4aa5-4d42-9626-ab690c041429/${agent-hint}?auth=2",
            "presentation": {
                "group": "remote",
                "order": 1
            },
            "internalConsoleOptions": "neverOpen"
        },
        {
            "name": "Preview in Copilot (Chrome)",
            "type": "chrome",
            "request": "launch",
            "url": "https://m365.cloud.microsoft/chat/entity1-d870f6cd-4aa5-4d42-9626-ab690c041429/${agent-hint}?auth=2",
            "presentation": {
                "group": "remote",
                "order": 2
            },
            "internalConsoleOptions": "neverOpen"
        },
        {
            "name": "Preview in Copilot with dev proxy(Edge)",
            "type": "msedge",
            "request": "launch",
            "url": "https://m365.cloud.microsoft/chat/entity1-d870f6cd-4aa5-4d42-9626-ab690c041429/${agent-hint}?auth=2",
            "presentation": {
                "group": "all",
                "hidden": true
            },
            "internalConsoleOptions": "neverOpen"
        }
    ],
    "compounds": [
        {
            "name": "Debug in Teams (Edge)",
            "configurations": [
                "Preview in Copilot with dev proxy(Edge)"
            ],
            "preLaunchTask": "Launch mock",
            "presentation": {
                "group": "2-Teams",
                "order": 1
            },
            "stopAll": true
        },
    ]
}
{{/DeclarativeCopilot}}

