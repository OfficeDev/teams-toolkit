{
  "$schema": "https://schema.management.azure.com/schemas/2015-01-01/deploymentParameters.json#",
  "contentVersion": "1.0.0.0",
  "parameters": {
    "resourceBaseName": {
      "value": "plugin${{RESOURCE_SUFFIX}}"
    },    
    "functionAppSKU": {
      "value": "Y1"
    },
    "functionStorageSKU": {
      "value": "Standard_LRS"
    },
    "apiKey": {
      "value": "${{SECRET_API_KEY}}"    
    }
  }
}