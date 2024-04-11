{
  "$schema": "https://schema.management.azure.com/schemas/2015-01-01/deploymentParameters.json#",
  "contentVersion": "1.0.0.0",
  "parameters": {
    "resourceBaseName": {
      "value": "bot${{RESOURCE_SUFFIX}}"
    },
    "botAadAppClientId": {
      "value": "${{BOT_ID}}"
    },
    "botAadAppClientSecret": {
      "value": "${{SECRET_BOT_PASSWORD}}"
    },
    {{#useOpenAI}}
    "openAIKey": {
      "value": "${{SECRET_OPENAI_API_KEY}}"
    },
    {{/useOpenAI}}
    {{#useAzureOpenAI}}
    "azureOpenAIKey": {
      "value": "${{SECRET_AZURE_OPENAI_API_KEY}}"
    },
    "azureOpenAIEndpoint": {
      "value": "${{AZURE_OPENAI_ENDPOINT}}"
    },
    "azureOpenAIDeployment": {
      "value": "${{AZURE_OPENAI_MODEL_DEPLOYMENT_NAME}}"
    },
    {{/useAzureOpenAI}}
    "webAppSKU": {
      "value": "B1"
    },
    "botDisplayName": {
      "value": "{{appName}}"
    }
  }
}