{{^DeclarativeCopilot}}
{
    "version": "0.2.0",
    "configurations": [
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
        }
    ]
}
{{/DeclarativeCopilot}}

