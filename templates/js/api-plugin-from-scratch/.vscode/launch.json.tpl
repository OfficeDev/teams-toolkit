{{^DeclarativeCopilot}}
{
    "version": "0.2.0",
    "configurations": [
        {
            "name": "Launch App in Teams (Edge)",
            "type": "msedge",
            "request": "launch",
            "url": "https://teams.microsoft.com?${account-hint}",
            "cascadeTerminateToConfigurations": [
                "Attach to Backend"
            ],
            "presentation": {
                "group": "all",
                "hidden": true
            },
            "internalConsoleOptions": "neverOpen",
            "perScriptSourcemaps": "yes"
        },
        {
            "name": "Launch App in Teams (Chrome)",
            "type": "chrome",
            "request": "launch",
            "url": "https://teams.microsoft.com?${account-hint}",
            "cascadeTerminateToConfigurations": [
                "Attach to Backend"
            ],
            "presentation": {
                "group": "all",
                "hidden": true
            },
            "internalConsoleOptions": "neverOpen",
            "perScriptSourcemaps": "yes"
        },
        {
            "name": "Preview in Copilot (Edge)",
            "type": "msedge",
            "request": "launch",
            "url": "https://teams.microsoft.com?${account-hint}",
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
            "url": "https://teams.microsoft.com?${account-hint}",
            "presentation": {
                "group": "remote",
                "order": 2
            },
            "internalConsoleOptions": "neverOpen"
        },
        {
            "name": "Attach to Backend",
            "type": "node",
            "request": "attach",
            "port": 9229,
            "restart": true,
            "presentation": {
                "group": "all",
                "hidden": true
            },
            "internalConsoleOptions": "neverOpen"
        },
        {
            "name": "Preview in Teams (Desktop)",
            "type": "node",
            "request": "launch",
            "preLaunchTask": "Start Teams App in Desktop Client (Remote)",
            "presentation": {
                "group": "remote",
                "order": 3
            },
            "internalConsoleOptions": "neverOpen"
        }
    ],
    "compounds": [
        {
            "name": "Debug in Copilot (Edge)",
            "configurations": [
                "Launch App in Teams (Edge)",
                "Attach to Backend"
            ],
            "preLaunchTask": "Start Teams App Locally",
            "presentation": {
                "group": "all",
                "order": 1
            },
            "stopAll": true
        },
        {
            "name": "Debug in Copilot (Chrome)",
            "configurations": [
                "Launch App in Teams (Chrome)",
                "Attach to Backend"
            ],
            "preLaunchTask": "Start Teams App Locally",
            "presentation": {
                "group": "all",
                "order": 2
            },
            "stopAll": true
        },
        {
            "name": "Debug in Teams (Desktop)",
            "configurations": [
                "Attach to Backend"
            ],
            "preLaunchTask": "Start Teams App in Desktop Client",
            "presentation": {
                "group": "all",
                "order": 3
            },
            "stopAll": true
        }
    ]
}
{{/DeclarativeCopilot}}
{{#DeclarativeCopilot}}
{
    "version": "0.2.0",
    "configurations": [
        {
            "name": "Launch App in Teams (Edge)",
            "type": "msedge",
            "request": "launch",
            "url": "https://www.office.com/chat?auth=2&cspoff=1&M365ChatFeatures=immersive-bizchat-avalon-endpoint%2cimmersive-bizchat-sydney-response-unpack-v2%2c-immersive-bizchat-send-conv-id-for-new-chat%2c-immersive-bizchat-handoff-buttons%2c-immersive-bizchat-enable-calendar-handoff%2c-immersive-bizchat-analytics-skill%2cimmersive-bizchat-enable-sydney-verbosity%2c-immersive-bizchat-chat-input-transform-spo-file-url%2cimmersive-bizchat-gpt",
            "cascadeTerminateToConfigurations": [
                "Attach to Backend"
            ],
            "presentation": {
                "group": "all",
                "hidden": true
            },
            "internalConsoleOptions": "neverOpen",
            "perScriptSourcemaps": "yes"
        },
        {
            "name": "Launch App in Teams (Chrome)",
            "type": "chrome",
            "request": "launch",
            "url": "https://www.office.com/chat?auth=2&cspoff=1&M365ChatFeatures=immersive-bizchat-avalon-endpoint%2cimmersive-bizchat-sydney-response-unpack-v2%2c-immersive-bizchat-send-conv-id-for-new-chat%2c-immersive-bizchat-handoff-buttons%2c-immersive-bizchat-enable-calendar-handoff%2c-immersive-bizchat-analytics-skill%2cimmersive-bizchat-enable-sydney-verbosity%2c-immersive-bizchat-chat-input-transform-spo-file-url%2cimmersive-bizchat-gpt",
            "cascadeTerminateToConfigurations": [
                "Attach to Backend"
            ],
            "presentation": {
                "group": "all",
                "hidden": true
            },
            "internalConsoleOptions": "neverOpen",
            "perScriptSourcemaps": "yes"
        },
        {
            "name": "Preview in Copilot (Edge)",
            "type": "msedge",
            "request": "launch",
            "url": "https://www.office.com/chat?auth=2&cspoff=1&M365ChatFeatures=immersive-bizchat-avalon-endpoint%2cimmersive-bizchat-sydney-response-unpack-v2%2c-immersive-bizchat-send-conv-id-for-new-chat%2c-immersive-bizchat-handoff-buttons%2c-immersive-bizchat-enable-calendar-handoff%2c-immersive-bizchat-analytics-skill%2cimmersive-bizchat-enable-sydney-verbosity%2c-immersive-bizchat-chat-input-transform-spo-file-url%2cimmersive-bizchat-gpt",
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
            "url": "https://www.office.com/chat?auth=2&cspoff=1&M365ChatFeatures=immersive-bizchat-avalon-endpoint%2cimmersive-bizchat-sydney-response-unpack-v2%2c-immersive-bizchat-send-conv-id-for-new-chat%2c-immersive-bizchat-handoff-buttons%2c-immersive-bizchat-enable-calendar-handoff%2c-immersive-bizchat-analytics-skill%2cimmersive-bizchat-enable-sydney-verbosity%2c-immersive-bizchat-chat-input-transform-spo-file-url%2cimmersive-bizchat-gpt",
            "presentation": {
                "group": "remote",
                "order": 2
            },
            "internalConsoleOptions": "neverOpen"
        },
        {
            "name": "Attach to Backend",
            "type": "node",
            "request": "attach",
            "port": 9229,
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
            "name": "Debug in Copilot (Edge)",
            "configurations": [
                "Launch App in Teams (Edge)",
                "Attach to Backend"
            ],
            "preLaunchTask": "Start Teams App Locally",
            "presentation": {
                "group": "all",
                "order": 1
            },
            "stopAll": true
        },
        {
            "name": "Debug in Copilot (Chrome)",
            "configurations": [
                "Launch App in Teams (Chrome)",
                "Attach to Backend"
            ],
            "preLaunchTask": "Start Teams App Locally",
            "presentation": {
                "group": "all",
                "order": 2
            },
            "stopAll": true
        }
    ]
}
{{/DeclarativeCopilot}}
