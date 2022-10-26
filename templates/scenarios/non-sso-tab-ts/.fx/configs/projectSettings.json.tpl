{
  "appName": "{{appName}}",
  "version": "2.1.0",
  "components": [
    {
      "name": "teams-tab",
      "hosting": "azure-storage",
      "deploy": true,
      "provision": true,
      "build": true,
      "folder": "tabs"
    },
    {
      "name": "azure-storage",
      "scenario": "Tab",
      "provision": true
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
    "capabilities": ["Tab"],
    "activeResourcePlugins": [
      "fx-resource-local-debug",
      "fx-resource-appstudio",
      "fx-resource-cicd",
      "fx-resource-api-connector",
      "fx-resource-frontend-hosting",
      "fx-resource-identity"
    ]
  }
}
