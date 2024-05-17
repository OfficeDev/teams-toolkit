{
    "version": "0.2.0",
    "configurations": [
        {
            "name": "Launch Remote in Teams (Edge)",
            "type": "msedge",
            "request": "launch",
            "url": "https://teams.microsoft.com/l/app/${{TEAMS_APP_ID}}?installAppPackage=true&webjoin=true&${account-hint}",
            "presentation": {
                "group": "group 1: Teams",
                "order": 3
            },
            "internalConsoleOptions": "neverOpen"
        },
        {
            "name": "Launch Remote in Teams (Chrome)",
            "type": "chrome",
            "request": "launch",
            "url": "https://teams.microsoft.com/l/app/${{TEAMS_APP_ID}}?installAppPackage=true&webjoin=true&${account-hint}",
            "presentation": {
                "group": "group 1: Teams",
                "order": 3
            },
            "internalConsoleOptions": "neverOpen"
        },
        {
            "name": "Launch Remote in Outlook (Edge)",
            "type": "msedge",
            "request": "launch",
            "url": "https://outlook.office.com/mail?${account-hint}",
            "presentation": {
                "group": "group 2: Outlook",
                "order": 3
            },
            "internalConsoleOptions": "neverOpen"
        },
        {
            "name": "Launch Remote in Outlook (Chrome)",
            "type": "chrome",
            "request": "launch",
            "url": "https://outlook.office.com/mail?${account-hint}",
            "presentation": {
                "group": "group 2: Outlook",
                "order": 3
            },
            "internalConsoleOptions": "neverOpen"
        },
        {
            "name": "Launch Remote in Copilot (Edge)",
            "type": "msedge",
            "request": "launch",
            "url": "https://teams.microsoft.com?${account-hint}",
            "presentation": {
                "group": "group 2: Copilot",
                "order": 3
            },
            "internalConsoleOptions": "neverOpen"
        },
        {
            "name": "Launch Remote in Copilot (Chrome)",
            "type": "chrome",
            "request": "launch",
            "url": "https://teams.microsoft.com?${account-hint}",
            "presentation": {
                "group": "group 2: Copilot",
                "order": 3
            },
            "internalConsoleOptions": "neverOpen"
        },
        {
            "name": "Launch App in Teams (Edge)",
            "type": "msedge",
            "request": "launch",
            "url": "https://teams.microsoft.com/l/app/${{local:TEAMS_APP_ID}}?installAppPackage=true&webjoin=true&${account-hint}",
            "cascadeTerminateToConfigurations": [
                "Attach to Local Service"
            ],
            "presentation": {
                "group": "all",
                "hidden": true
            },
            "internalConsoleOptions": "neverOpen"
        },
        {
            "name": "Launch App in Teams (Chrome)",
            "type": "chrome",
            "request": "launch",
            "url": "https://teams.microsoft.com/l/app/${{local:TEAMS_APP_ID}}?installAppPackage=true&webjoin=true&${account-hint}",
            "cascadeTerminateToConfigurations": [
                "Attach to Local Service"
            ],
            "presentation": {
                "group": "all",
                "hidden": true
            },
            "internalConsoleOptions": "neverOpen"
        },
        {
            "name": "Launch App in Outlook (Edge)",
            "type": "msedge",
            "request": "launch",
            "url": "https://outlook.office.com/mail?${account-hint}",
            "cascadeTerminateToConfigurations": [
                "Attach to Local Service"
            ],
            "presentation": {
                "group": "all",
                "hidden": true
            },
            "internalConsoleOptions": "neverOpen"
        },
        {
            "name": "Launch App in Outlook (Chrome)",
            "type": "chrome",
            "request": "launch",
            "url": "https://outlook.office.com/mail?${account-hint}",
            "cascadeTerminateToConfigurations": [
                "Attach to Local Service"
            ],
            "presentation": {
                "group": "all",
                "hidden": true
            },
            "internalConsoleOptions": "neverOpen"
        },
        {
            "name": "Launch App in Copilot (Edge)",
            "type": "msedge",
            "request": "launch",
            "url": "https://teams.microsoft.com?${account-hint}",
            "cascadeTerminateToConfigurations": [
                "Attach to Local Service"
            ],
            "presentation": {
                "group": "all",
                "hidden": true
            },
            "internalConsoleOptions": "neverOpen"
        },
        {
            "name": "Launch App in Copilot (Chrome)",
            "type": "chrome",
            "request": "launch",
            "url": "https://teams.microsoft.com?${account-hint}",
            "cascadeTerminateToConfigurations": [
                "Attach to Local Service"
            ],
            "presentation": {
                "group": "all",
                "hidden": true
            },
            "internalConsoleOptions": "neverOpen"
        },
        {
            "name": "Attach to Local Service",
            "type": "node",
            "request": "attach",
            "port": 9239,
            "restart": true,
            "presentation": {
                "group": "all",
                "hidden": true
            },
            "internalConsoleOptions": "neverOpen"
        }
    ],
    "compounds": [
        {
            "name": "Debug in Test Tool",
            "configurations": [
                "Attach to Local Service"
            ],
            "preLaunchTask": "Start Teams App (Test Tool)",
            "presentation": {
{{#enableMETestToolByDefault}}
                "group": "group 0: Teams App Test Tool",
{{/enableMETestToolByDefault}}
{{^enableMETestToolByDefault}}
                "group": "group 3: Teams App Test Tool",
{{/enableMETestToolByDefault}}
                "order": 1
            },
            "stopAll": true
        },
        {
            "name": "Debug in Teams (Edge)",
            "configurations": [
                "Launch App in Teams (Edge)",
                "Attach to Local Service"
            ],
            "preLaunchTask": "Start Teams App Locally",
            "presentation": {
                "group": "group 1: Teams",
                "order": 1
            },
            "stopAll": true
        },
        {
            "name": "Debug in Teams (Chrome)",
            "configurations": [
                "Launch App in Teams (Chrome)",
                "Attach to Local Service"
            ],
            "preLaunchTask": "Start Teams App Locally",
            "presentation": {
                "group": "group 1: Teams",
                "order": 2
            },
            "stopAll": true
        },
        {
            "name": "Debug in Outlook (Edge)",
            "configurations": [
                "Launch App in Outlook (Edge)",
                "Attach to Local Service"
            ],
            "preLaunchTask": "Start Teams App Locally",
            "presentation": {
                "group": "group 2: Outlook",
                "order": 1
            },
            "stopAll": true
        },
        {
            "name": "Debug in Outlook (Chrome)",
            "configurations": [
                "Launch App in Outlook (Chrome)",
                "Attach to Local Service"
            ],
            "preLaunchTask": "Start Teams App Locally",
            "presentation": {
                "group": "group 2: Outlook",
                "order": 2
            },
            "stopAll": true
        },
        {
            "name": "Debug in Copilot (Edge)",
            "configurations": [
                "Launch App in Copilot (Edge)",
                "Attach to Local Service"
            ],
            "preLaunchTask": "Start Teams App Locally (Copilot)",
            "presentation": {
                "group": "group 2: Copilot",
                "order": 1
            },
            "stopAll": true
        },
        {
            "name": "Debug in Copilot (Chrome)",
            "configurations": [
                "Launch App in Copilot (Chrome)",
                "Attach to Local Service"
            ],
            "preLaunchTask": "Start Teams App Locally (Copilot)",
            "presentation": {
                "group": "group 2: Copilot",
                "order": 2
            },
            "stopAll": true
        }
    ]
}
