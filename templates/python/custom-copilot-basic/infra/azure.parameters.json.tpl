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
    {{#useAzureOpenAI}}
    "azureOpenaiKey": {
      "value": "${{SECRET_AZURE_OPENAI_API_KEY}}"
    },
    "azureOpenaiModelDeploymentName" : {
      "value": "${{AZURE_OPENAI_MODEL_DEPLOYMENT_NAME}}"
    },
    "azureOpenaiEndpoint" : {
      "value": "${{SECRET_AZURE_OPENAI_ENDPOINT}}"
    },
    {{/useAzureOpenAI}}
    {{#useOpenAI}}
    "openaiKey": {
      "value": "${{SECRET_OPENAI_API_KEY}}"
    },
    {{/useOpenAI}}
    "webAppSKU": {
      "value": "B1"
    },
    "botDisplayName": {
      "value": "{{appName}}"
    },
    "linuxFxVersion": {
      "value": "PYTHON|3.11"
    }
  }
}