{
    "$schema": "https://schema.management.azure.com/schemas/2015-01-01/deploymentParameters.json#",
    "contentVersion": "1.0.0.0",
    "parameters": {
      "resourceBaseName": {
        "value": "notification${{RESOURCE_SUFFIX}}"
      },
      "botAadAppClientId": {
        "value": "${{BOT_ID}}"
      },
      "botAadAppClientSecret": {
        "value": "${{SECRET_BOT_PASSWORD}}"
      },
      "functionAppSKU": {
        "value": "B1"
      },
      "storageSKU": {
        "value": "Standard_LRS"
      },
      "botDisplayName": {
        "value": "{{appName}}"
      }
    }
  }