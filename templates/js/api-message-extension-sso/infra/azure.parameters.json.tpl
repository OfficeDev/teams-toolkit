{
  "$schema": "https://schema.management.azure.com/schemas/2015-01-01/deploymentParameters.json#",
  "contentVersion": "1.0.0.0",
  "parameters": {
    "resourceBaseName": {
      "value": "apime${{RESOURCE_SUFFIX}}"
    },    
    "functionAppSKU": {
      "value": "Y1"
    },
    "functionStorageSKU": {
      "value": "Standard_LRS"
    },
    "aadAppClientId": {
      "value": "${{AAD_APP_CLIENT_ID}}"
    },
    "aadAppTenantId": {
      "value": "${{AAD_APP_TENANT_ID}}"
    },
    "aadAppOauthAuthorityHost": {
      "value": "${{AAD_APP_OAUTH_AUTHORITY_HOST}}"
    }
  }
}