{
    "$schema": "https://schema.management.azure.com/schemas/2015-01-01/deploymentParameters.json#",
    "contentVersion": "1.0.0.0",
    "parameters": {
      "resourceBaseName": {
        "value": "bot${{RESOURCE_SUFFIX}}"
      },
{{#useOpenAI}}
      "openAIApiKey": {
        "value": "${{SECRET_OPENAI_API_KEY}}"
      },
{{/useOpenAI}}
{{#useAzureOpenAI}}
      "azureOpenAIApiKey": {
        "value": "${{SECRET_AZURE_OPENAI_API_KEY}}"
      },
      "azureOpenAIEndpoint": {
        "value": "${{AZURE_OPENAI_ENDPOINT}}"
      },
      "azureOpenAIDeploymentName": {
        "value": "${{AZURE_OPENAI_DEPLOYMENT_NAME}}"
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