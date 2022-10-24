{
  "appName": "{{appName}}",
  "version": "2.1.0",
  "components": [
    {
      "name": "teams-bot",
      "hosting": "azure-web-app",
      "provision": false,
      "deploy": true,
      "capabilities": ["command-and-response"],
      "build": true,
      "folder": "bot"
    },
    {
      "name": "bot-service",
      "provision": true
    },
    {
      "name": "azure-web-app",
      "scenario": "Bot",
      "connections": ["identity", "teams-bot"]
    },
    {
      "name": "identity",
      "provision": true
    }
  ],
  "programmingLanguage": "typescript",
  "solutionSettings": {
    "name": "fx-solution-azure",
    "version": "1.0.0",
    "hostType": "Azure",
    "azureResources": [],
    "capabilities": ["Bot"],
    "activeResourcePlugins": [
      "fx-resource-local-debug",
      "fx-resource-appstudio",
      "fx-resource-cicd",
      "fx-resource-api-connector",
      "fx-resource-bot",
      "fx-resource-identity"
    ]
  },
  "pluginSettings": {
    "fx-resource-bot": {
      "host-type": "app-service",
      "capabilities": ["command-and-response"]
    }
  }
}
