{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Launch Remote (Edge)",
      "type": "msedge",
      "request": "launch",
      "url": "https://teams.microsoft.com/l/app/${{TEAMS_APP_ID}}?installAppPackage=true&webjoin=true&${account-hint}",
      "presentation": {
        "group": "3-remote",
        "order": 1
      },
      "internalConsoleOptions": "neverOpen"
    },
    {
      "name": "Launch Remote (Chrome)",
      "type": "chrome",
      "request": "launch",
      "url": "https://teams.microsoft.com/l/app/${{TEAMS_APP_ID}}?installAppPackage=true&webjoin=true&${account-hint}",
      "presentation": {
        "group": "3-remote",
        "order": 2
      },
      "internalConsoleOptions": "neverOpen"
    },
    {
      "name": "Launch Remote (Desktop)",
      "type": "node",
      "request": "launch",
      "preLaunchTask": "Start Teams App in Desktop Client (Remote)",
      "presentation": {
        "group": "3-remote",
        "order": 3
      },
      "internalConsoleOptions": "neverOpen"
    },
    {
      "name": "Launch App (Edge)",
      "type": "msedge",
      "request": "launch",
      "url": "https://teams.microsoft.com/l/app/${{local:TEAMS_APP_ID}}?installAppPackage=true&webjoin=true&${account-hint}",
      "presentation": {
        "group": "all",
        "hidden": true
      },
      "internalConsoleOptions": "neverOpen"
    },
    {
      "name": "Launch App (Chrome)",
      "type": "chrome",
      "request": "launch",
      "url": "https://teams.microsoft.com/l/app/${{local:TEAMS_APP_ID}}?installAppPackage=true&webjoin=true&${account-hint}",
      "presentation": {
        "group": "all",
        "hidden": true
      },
      "internalConsoleOptions": "neverOpen"
    },
    {
      "name": "Start Python",
      "type": "debugpy",
      "request": "launch",
      "program": "${workspaceFolder}/src/app.py",
      "cwd": "${workspaceFolder}/src",
      "console": "integratedTerminal"
    },
    {
        "name": "Start Test Tool",
        "type": "node",
        "request": "launch",
        "program": "${workspaceFolder}/devTools/teamsapptester/node_modules/@microsoft/teams-app-test-tool/cli.js",
        "args": [
            "start"
        ],
        "cwd": "${workspaceFolder}",
        "console": "integratedTerminal",
        "internalConsoleOptions": "neverOpen"
    {{#CEAEnabled}}
    },
    {
      "name": "Launch in Microsoft 365 app (Edge)",
      "type": "msedge",
      "request": "launch",
      "url": "https://www.office.com/chat",
      "presentation": {
        "group": "all",
        "hidden": true
      },
      "internalConsoleOptions": "neverOpen"
    },
    {
      "name": "Launch in Microsoft 365 app (Chrome)",
      "type": "chrome",
      "request": "launch",
      "url": "https://www.office.com/chat",
      "presentation": {
        "group": "all",
        "hidden": true
      },
      "internalConsoleOptions": "neverOpen"
    {{/CEAEnabled}}
    }
  ],
  "compounds": [
    {
      "name": "Debug in Teams (Edge)",
      "configurations": ["Launch App (Edge)", "Start Python"],
      "cascadeTerminateToConfigurations": ["Start Python"],
      "preLaunchTask": "Start Teams App Locally",
      "presentation": {
        "group": "1-local",
        "order": 1
      },
      "stopAll": true
    },
    {
      "name": "Debug in Teams (Chrome)",
      "configurations": ["Launch App (Chrome)", "Start Python"],
      "cascadeTerminateToConfigurations": ["Start Python"],
      "preLaunchTask": "Start Teams App Locally",
      "presentation": {
        "group": "1-local",
        "order": 2
      },
      "stopAll": true
    },
    {
      "name": "Debug in Teams (Desktop)",
      "configurations": ["Start Python"],
      "preLaunchTask": "Start Teams App in Desktop Client",
      "presentation": {
        "group": "1-local",
        "order": 3
      },
      "stopAll": true
    },
    {
        "name": "Debug in Test Tool",
        "configurations": [
            "Start Python",
            "Start Test Tool"
        ],
        "cascadeTerminateToConfigurations": [
            "Start Test Tool"
        ],
        "preLaunchTask": "Deploy (Test Tool)",
        "presentation": {
            "group": "2-local",
            "order": 1
        },
        "stopAll": true
    {{#CEAEnabled}}
    },
    {
      "name": "Preview in Copilot (Edge)",
      "configurations": ["Launch in Microsoft 365 app (Edge)", "Start Python"],
      "cascadeTerminateToConfigurations": ["Start Python"],
      "preLaunchTask": "Start Teams App Locally",
      "presentation": {
        "group": "3-local",
        "order": 1
      },
      "stopAll": true
    },
    {
      "name": "Preview in Copilot (Chrome)",
      "configurations": ["Launch in Microsoft 365 app (Chrome)", "Start Python"],
      "cascadeTerminateToConfigurations": ["Start Python"],
      "preLaunchTask": "Start Teams App Locally",
      "presentation": {
        "group": "3-local",
        "order": 1
      },
      "stopAll": true
    {{/CEAEnabled}}
    }
  ]
}
